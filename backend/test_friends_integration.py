import requests
import json
import time

# Test integration with running backend
BASE_URL = "http://localhost:8000/api/v1"

# Mock Auth0 token for testing
MOCK_JWT = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6Im1vY2standrcyJ9.eyJhdWQiOiJhaWdtLWFwaSIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNzA5MzMwNDAwLCJpc3MiOiJodHRwczovL2FpZ20tZGV2LmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHwxMjM0NTY3ODkwIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJUZXN0IFVzZXIiLCJuaWNrbmFtZSI6InRlc3R1c2VyIn0.mock-signature"

def test_friends_endpoints():
    """Test friends endpoints with integration tests"""
    headers = {"Authorization": f"Bearer {MOCK_JWT}"}
    
    print("Testing Friends System Integration")
    print("=" * 50)
    
    # Test 1: Health check
    try:
        response = requests.get(f"{BASE_URL.replace('/api/v1', '')}/health")
        print(f"Health check: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"Health check failed: {e}")
        return
    
    # Test 2: List friends (should be empty initially)
    try:
        response = requests.get(f"{BASE_URL}/friends/", headers=headers)
        print(f"List friends: {response.status_code}")
        if response.status_code == 200:
            friends = response.json()
            print(f"   Friends count: {len(friends)}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"List friends failed: {e}")
    
    # Test 3: Get current user info
    try:
        response = requests.get(f"{BASE_URL}/users/me", headers=headers)
        print(f"Get current user: {response.status_code}")
        if response.status_code == 200:
            user = response.json()
            print(f"   User: {user.get('username', 'N/A')} ({user.get('id', 'N/A')})")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"Get current user failed: {e}")
    
    # Test 4: Test friend request validation (self-friending)
    try:
        response = requests.post(
            f"{BASE_URL}/friends/request",
            headers=headers,
            json={"user_id": "auth0|123456789"}  # Same as token subject
        )
        print(f"Self-friend request: {response.status_code}")
        if response.status_code == 400:
            print(f"   Correctly rejected: {response.json().get('detail', 'N/A')}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"Self-friend test failed: {e}")
    
    # Test 5: Test friend request to non-existent user
    try:
        response = requests.post(
            f"{BASE_URL}/friends/request",
            headers=headers,
            json={"user_id": "nonexistent-user-123"}
        )
        print(f"Friend request to non-existent user: {response.status_code}")
        if response.status_code == 404:
            print(f"   Correctly rejected: {response.json().get('detail', 'N/A')}")
        else:
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"Non-existent user test failed: {e}")
    
    # Test 6: List friend requests
    try:
        response = requests.get(f"{BASE_URL}/friends/requests", headers=headers)
        print(f"List friend requests: {response.status_code}")
        if response.status_code == 200:
            requests_data = response.json()
            print(f"   Pending requests: {len(requests_data)}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"List friend requests failed: {e}")
    
    # Test 7: Get friendship status with non-existent user
    try:
        response = requests.get(f"{BASE_URL}/friends/status/nonexistent-user", headers=headers)
        print(f"Friendship status check: {response.status_code}")
        if response.status_code == 200:
            status = response.json()
            print(f"   Status: {status.get('status', 'N/A')}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"Friendship status failed: {e}")
    
    # Test 8: Test blocking validation (self-blocking)
    try:
        response = requests.post(
            f"{BASE_URL}/friends/block/auth0|123456789",  # Same as token subject
            headers=headers
        )
        print(f"Self-block attempt: {response.status_code}")
        if response.status_code == 400:
            print(f"   Correctly rejected: {response.json().get('detail', 'N/A')}")
        else:
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"Self-block test failed: {e}")
    
    # Test 9: List blocked users
    try:
        response = requests.get(f"{BASE_URL}/friends/blocked", headers=headers)
        print(f"List blocked users: {response.status_code}")
        if response.status_code == 200:
            blocked = response.json()
            print(f"   Blocked users count: {len(blocked)}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"List blocked users failed: {e}")
    
    print("\nFriends system integration test completed!")

if __name__ == "__main__":
    test_friends_endpoints()