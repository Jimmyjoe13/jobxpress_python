import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getArticleBySlug, getAllArticleSlugs, markdownToHtml, estimateReadingTime } from "@/lib/blog"
import { ArticleHeader } from "@/components/blog/ArticleHeader"
import { ArticleContent } from "@/components/blog/ArticleContent"
import { BlogSidebar } from "@/components/blog/BlogSidebar"

const SITE_URL = "https://jobxpress.fr"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = getAllArticleSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const article = getArticleBySlug(slug)

  if (!article) {
    return { title: "Article introuvable | jobXpress" }
  }

  const url = `${SITE_URL}/blog/${article.slug}`

  return {
    title: article.title,
    description: article.description,
    keywords: article.tags,
    authors: [{ name: article.author }],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      url,
      siteName: "jobXpress",
      locale: "fr_FR",
      type: "article",
      publishedTime: article.date,
      authors: [article.author],
      tags: article.tags,
      ...(article.image && { images: [{ url: article.image, width: 1200, height: 630 }] }),
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
      ...(article.image && { images: [article.image] }),
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

function renderArticle(article: NonNullable<ReturnType<typeof getArticleBySlug>>) {
  const htmlContent = markdownToHtml(article.content)
  const url = `${SITE_URL}/blog/${article.slug}`

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    author: {
      "@type": "Organization",
      name: article.author,
    },
    publisher: {
      "@type": "Organization",
      name: "jobXpress",
      url: SITE_URL,
    },
    datePublished: article.date,
    dateModified: article.date,
    url,
    mainEntityOfPage: url,
    keywords: article.tags.join(", "),
    inLanguage: "fr",
    ...(article.image && { image: article.image }),
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Accueil",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${SITE_URL}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: url,
      },
    ],
  }

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12">
        {/* Article content */}
        <article className="max-w-3xl">
          <ArticleHeader article={article} />
          <ArticleContent html={htmlContent} />

          {/* Article footer */}
          <div className="mt-12 border-t border-border pt-8">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Article publié par {article.author}</span>
              <span>{estimateReadingTime(article.content)} min de lecture</span>
            </div>
          </div>
        </article>

        {/* Sidebar */}
        <div className="hidden lg:block">
          <BlogSidebar currentTags={article.tags} />
        </div>
      </div>
    </>
  )
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params
  const article = getArticleBySlug(slug)

  if (!article) {
    notFound()
  }

  return renderArticle(article)
}
