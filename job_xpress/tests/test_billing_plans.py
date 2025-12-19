"""
Tests pour le service de billing et les plans de tarification.

Teste les 3 plans: FREE (Freemium), STARTER, PRO
"""

import pytest
from datetime import datetime, timedelta, timezone
from services.billing import PLANS, get_plan_config, BillingService


class TestPlansConfiguration:
    """Tests pour la configuration des plans."""
    
    def test_plans_have_all_required_keys(self):
        """Vérifie que tous les plans ont les clés requises."""
        required_keys = [
            "credits", "reset_days", "name", "price",
            "jobyjoba_messages", "jobyjoba_daily_limit", "custom_context"
        ]
        
        for plan_name, plan_config in PLANS.items():
            for key in required_keys:
                assert key in plan_config, f"Plan {plan_name} manque la clé '{key}'"
    
    def test_free_plan_configuration(self):
        """Teste la configuration du plan FREE (Freemium)."""
        free = PLANS["FREE"]
        
        assert free["credits"] == 5
        assert free["reset_days"] == 7
        assert free["name"] == "Freemium"
        assert free["price"] == 0
        assert free["jobyjoba_messages"] == 10
        assert free["jobyjoba_daily_limit"] == False
        assert free["custom_context"] == False
    
    def test_starter_plan_configuration(self):
        """Teste la configuration du plan STARTER."""
        starter = PLANS["STARTER"]
        
        assert starter["credits"] == 100
        assert starter["reset_days"] == 30
        assert starter["name"] == "Starter"
        assert starter["price"] == 9.99
        assert starter["jobyjoba_messages"] == 10
        assert starter["jobyjoba_daily_limit"] == False
        assert starter["custom_context"] == False
    
    def test_pro_plan_configuration(self):
        """Teste la configuration du plan PRO."""
        pro = PLANS["PRO"]
        
        assert pro["credits"] == 300
        assert pro["reset_days"] == 30
        assert pro["name"] == "Pro"
        assert pro["price"] == 24.99
        assert pro["jobyjoba_messages"] == 20
        assert pro["jobyjoba_daily_limit"] == True
        assert pro["custom_context"] == True
    
    def test_get_plan_config_returns_copy(self):
        """Vérifie que get_plan_config retourne une copie."""
        config1 = get_plan_config("FREE")
        config2 = get_plan_config("FREE")
        
        config1["credits"] = 999
        assert config2["credits"] == 5  # Non modifié
    
    def test_get_plan_config_fallback_to_free(self):
        """Vérifie le fallback vers FREE pour un plan inconnu."""
        config = get_plan_config("UNKNOWN_PLAN")
        
        assert config["name"] == "Freemium"
        assert config["credits"] == 5


class TestBillingServiceMethods:
    """Tests pour les méthodes du BillingService (sans DB)."""
    
    def test_get_plan_features_free(self):
        """Teste get_plan_features pour FREE."""
        # On mocke le db_service avec None car on ne l'utilise pas
        service = BillingService(None)
        
        features = service.get_plan_features("FREE")
        
        assert features["name"] == "Freemium"
        assert features["credits"] == 5
        assert features["custom_context"] == False
    
    def test_get_plan_features_starter(self):
        """Teste get_plan_features pour STARTER."""
        service = BillingService(None)
        
        features = service.get_plan_features("STARTER")
        
        assert features["name"] == "Starter"
        assert features["credits"] == 100
        assert features["price"] == 9.99
    
    def test_get_plan_features_pro(self):
        """Teste get_plan_features pour PRO."""
        service = BillingService(None)
        
        features = service.get_plan_features("PRO")
        
        assert features["name"] == "Pro"
        assert features["credits"] == 300
        assert features["custom_context"] == True
    
    def test_get_jobyjoba_limit_free(self):
        """Teste les limites JobyJoba pour FREE."""
        service = BillingService(None)
        
        limits = service.get_jobyjoba_limit("FREE")
        
        assert limits["max_messages"] == 10
        assert limits["is_daily_limit"] == False
        assert limits["custom_context_enabled"] == False
    
    def test_get_jobyjoba_limit_starter(self):
        """Teste les limites JobyJoba pour STARTER."""
        service = BillingService(None)
        
        limits = service.get_jobyjoba_limit("STARTER")
        
        assert limits["max_messages"] == 10
        assert limits["is_daily_limit"] == False
        assert limits["custom_context_enabled"] == False
    
    def test_get_jobyjoba_limit_pro(self):
        """Teste les limites JobyJoba pour PRO."""
        service = BillingService(None)
        
        limits = service.get_jobyjoba_limit("PRO")
        
        assert limits["max_messages"] == 20
        assert limits["is_daily_limit"] == True
        assert limits["custom_context_enabled"] == True
    
    def test_get_jobyjoba_limit_unknown_plan(self):
        """Teste le fallback JobyJoba pour un plan inconnu."""
        service = BillingService(None)
        
        limits = service.get_jobyjoba_limit("UNKNOWN")
        
        # Devrait fallback sur FREE
        assert limits["max_messages"] == 10
        assert limits["is_daily_limit"] == False


class TestPlanPricingLogic:
    """Tests pour la logique de pricing."""
    
    def test_starter_is_cheapest_paid_plan(self):
        """Vérifie que STARTER est le plan payant le moins cher."""
        paid_plans = {k: v for k, v in PLANS.items() if v["price"] > 0}
        cheapest = min(paid_plans.items(), key=lambda x: x[1]["price"])
        
        assert cheapest[0] == "STARTER"
        assert cheapest[1]["price"] == 9.99
    
    def test_pro_has_most_credits(self):
        """Vérifie que PRO a le plus de crédits."""
        max_credits_plan = max(PLANS.items(), key=lambda x: x[1]["credits"])
        
        assert max_credits_plan[0] == "PRO"
        assert max_credits_plan[1]["credits"] == 300
    
    def test_pro_has_best_jobyjoba(self):
        """Vérifie que PRO a les meilleures limites JobyJoba."""
        pro = PLANS["PRO"]
        
        assert pro["jobyjoba_messages"] == 20
        assert pro["jobyjoba_daily_limit"] == True
        assert pro["custom_context"] == True
    
    def test_reset_periods_are_valid(self):
        """Vérifie que toutes les périodes de reset sont valides."""
        for plan_name, config in PLANS.items():
            assert config["reset_days"] in [7, 30], f"Plan {plan_name} a une période invalide"
    
    def test_free_is_weekly_reset(self):
        """Vérifie que FREE a un reset hebdomadaire."""
        assert PLANS["FREE"]["reset_days"] == 7
    
    def test_paid_plans_are_monthly_reset(self):
        """Vérifie que les plans payants ont un reset mensuel."""
        assert PLANS["STARTER"]["reset_days"] == 30
        assert PLANS["PRO"]["reset_days"] == 30
