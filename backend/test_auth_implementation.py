#!/usr/bin/env python3
"""
Test script to validate Auth0 integration implementation
This script performs basic validation without requiring a full server setup
"""

import sys
import os
sys.path.append('.')

# Basic import validation
def test_imports():
    print("Testing imports...")
    try:
        from app.schemas.auth import LoginRequest, LoginResponse
        print("✓ Auth schemas imported successfully")
    except ImportError as e:
        print(f"✗ Auth schemas import failed: {e}")
        return False
    
    try:
        from app.services.email_service import EmailService
        print("✓ Email service imported successfully")
    except ImportError as e:
        print(f"✗ Email service import failed: {e}")
        return False
    
    try:
        from app.core.config import settings
        print("✓ Config imported successfully")
    except ImportError as e:
        print(f"✗ Config import failed: {e}")
        return False
    
    return True

def test_email_service():
    print("\nTesting email service...")
    try:
        from app.services.email_service import EmailService
        
        # Test token generation/verification
        email_service = EmailService()
        test_email = "test@example.com"
        
        # Generate token
        token = email_service.generate_verification_token(test_email)
        print(f"✓ Token generated: {token[:20]}...")
        
        # Verify token
        verified_email = email_service.verify_verification_token(token)
        if verified_email == test_email:
            print("✓ Token verification successful")
        else:
            print(f"✗ Token verification failed: expected {test_email}, got {verified_email}")
            return False
        
        # Test invalid token
        invalid_result = email_service.verify_verification_token("invalid_token")
        if invalid_result is None:
            print("✓ Invalid token properly rejected")
        else:
            print(f"✗ Invalid token accepted: {invalid_result}")
            return False
        
        return True
        
    except Exception as e:
        print(f"✗ Email service test failed: {e}")
        return False

def test_auth_schemas():
    print("\nTesting auth schemas...")
    try:
        from app.schemas.auth import LoginRequest, LoginResponse, TokenPayload
        
        # Test LoginRequest validation
        login_req = LoginRequest(access_token="test_token_123")
        print(f"✓ LoginRequest created: {login_req.access_token}")
        
        # Test empty token validation
        try:
            LoginRequest(access_token="")
            print("✗ Empty token should have failed validation")
            return False
        except ValueError:
            print("✓ Empty token properly rejected")
        
        # Test LoginResponse
        login_resp = LoginResponse(
            access_token="test_token",
            user={"id": "123", "email": "test@example.com"},
            message="Success"
        )
        print(f"✓ LoginResponse created: {login_resp.message}")
        
        return True
        
    except Exception as e:
        print(f"✗ Auth schemas test failed: {e}")
        return False

def test_config():
    print("\nTesting configuration...")
    try:
        from app.core.config import settings
        
        # Check required settings exist
        required_settings = [
            'API_V1_STR', 'PROJECT_NAME', 'DATABASE_URL',
            'AUTH0_DOMAIN', 'AUTH0_CLIENT_ID', 'AUTH0_AUDIENCE',
            'JWT_SECRET_KEY', 'JWT_ALGORITHM'
        ]
        
        for setting in required_settings:
            if hasattr(settings, setting):
                print(f"✓ {setting} configured")
            else:
                print(f"✗ {setting} missing from config")
                return False
        
        # Check Auth0 JWKS URL construction
        if settings.AUTH0_JWKS_URL:
            print(f"✓ Auth0 JWKS URL: {settings.AUTH0_JWKS_URL}")
        else:
            print("✗ Auth0 JWKS URL not configured")
            return False
        
        return True
        
    except Exception as e:
        print(f"✗ Config test failed: {e}")
        return False

def test_auth_flow():
    print("\nTesting auth flow components...")
    try:
        # Test Auth0Token class structure
        import inspect
        from app.auth.auth0 import Auth0Token
        
        # Check Auth0Token has required methods
        required_methods = ['_verify_token', 'user_id', 'email', 'email_verified']
        for method in required_methods:
            if hasattr(Auth0Token, method):
                print(f"✓ Auth0Token has {method}")
            else:
                print(f"✗ Auth0Token missing {method}")
                return False
        
        # Test dependencies import
        from app.auth.dependencies import get_current_user
        print("✓ Auth dependencies imported")
        
        return True
        
    except Exception as e:
        print(f"✗ Auth flow test failed: {e}")
        return False

def main():
    print("AIGM Auth0 Integration Validation")
    print("=" * 40)
    
    tests = [
        ("Import Validation", test_imports),
        ("Email Service", test_email_service),
        ("Auth Schemas", test_auth_schemas),
        ("Configuration", test_config),
        ("Auth Flow", test_auth_flow)
    ]
    
    passed = 0
    total = len(tests)
    
    for name, test_func in tests:
        print(f"\n{name}:")
        print("-" * 20)
        if test_func():
            print(f"✓ {name} PASSED")
            passed += 1
        else:
            print(f"✗ {name} FAILED")
    
    print(f"\n" + "=" * 40)
    print(f"Test Results: {passed}/{total} passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Auth0 integration is ready.")
        print("\nNext steps:")
        print("1. Set up Auth0 environment variables:")
        print("   - AUTH0_DOMAIN")
        print("   - AUTH0_CLIENT_ID")
        print("   - AUTH0_CLIENT_SECRET")
        print("   - AUTH0_AUDIENCE")
        print("2. Set up AWS SES credentials:")
        print("   - AWS_ACCESS_KEY_ID")
        print("   - AWS_SECRET_ACCESS_KEY")
        print("   - AWS_REGION")
        print("3. Start the server: uvicorn main:app --reload")
        print("4. Test with Swagger UI: http://localhost:8000/docs")
    else:
        print(f"\n❌ {total - passed} tests failed. Check the errors above.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)