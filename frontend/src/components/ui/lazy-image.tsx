"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  placeholder?: "blur" | "empty"
  blurDataURL?: string
  priority?: boolean
}

export function LazyImage({
  src,
  alt,
  className = "",
  width,
  height,
  placeholder = "empty",
  blurDataURL,
  priority = false,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(priority)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (priority) {
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: "100px",
        threshold: 0.1,
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [priority])

  const defaultBlurDataURL =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMxZTI5M2IiLz48L3N2Zz4="

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Placeholder */}
      {placeholder === "blur" && !isLoaded && (
        <div
          className="absolute inset-0 bg-slate-800 animate-pulse"
          style={{
            backgroundImage: `url(${blurDataURL || defaultBlurDataURL})`,
            backgroundSize: "cover",
            filter: "blur(20px)",
            transform: "scale(1.1)",
          }}
        />
      )}

      {placeholder === "empty" && !isLoaded && (
        <div className="absolute inset-0 bg-slate-800/50 animate-pulse" />
      )}

      {/* Actual image */}
      {isInView && (
        <motion.img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className={`w-full h-full object-cover ${className}`}
        />
      )}
    </div>
  )
}

// Skeleton placeholder for images
interface ImageSkeletonProps {
  className?: string
  aspectRatio?: "square" | "video" | "portrait" | "wide"
}

export function ImageSkeleton({
  className = "",
  aspectRatio = "video",
}: ImageSkeletonProps) {
  const aspectRatios = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
    wide: "aspect-[21/9]",
  }

  return (
    <div
      className={`${aspectRatios[aspectRatio]} bg-slate-800/50 animate-pulse rounded-xl ${className}`}
    >
      <div className="w-full h-full flex items-center justify-center">
        <svg
          className="w-10 h-10 text-slate-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    </div>
  )
}

// Optimized avatar image with fallback
interface AvatarImageProps {
  src?: string
  alt: string
  fallback?: string
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

export function AvatarImage({
  src,
  alt,
  fallback,
  size = "md",
  className = "",
}: AvatarImageProps) {
  const [error, setError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const sizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
    xl: "w-20 h-20",
  }

  const initials = fallback || alt.charAt(0).toUpperCase()

  if (!src || error) {
    return (
      <div
        className={`${sizes[size]} rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold ${className}`}
      >
        {initials}
      </div>
    )
  }

  return (
    <div className={`${sizes[size]} relative overflow-hidden rounded-full ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-800 animate-pulse rounded-full" />
      )}
      <motion.img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="w-full h-full object-cover rounded-full"
      />
    </div>
  )
}
