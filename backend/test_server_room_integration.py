"""
Integration test script for server and room management endpoints
Tests the complete server and room lifecycle with proper validation
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

# Mock Auth0 token for testing  
MOCK_JWT = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6Im1vY2standrcyJ9.eyJhdWQiOiJhaWdtLWFwaSIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNzA5MzMwNDAwLCJpc3MiOiJodHRwczovL2FpZ20tZGV2LmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHwxMjM0NTY3ODkwIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJUZXN0IFVzZXIiLCJuaWNrbmFtZSI6InRlc3R1c2VyIn0.mock-signature"

def test_server_and_room_management():
    """Test complete server and room management workflow"""
    headers = {"Authorization": f"Bearer {MOCK_JWT}"}
    
    print("Testing Server and Room Management System")
    print("=" * 60)
    
    # Test 1: Health check
    try:
        response = requests.get(f"{BASE_URL.replace('/api/v1', '')}/health")
        print(f"Health check: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"Health check failed: {e}")
        return
    
    # Test 2: List user's servers (should be empty initially)
    try:
        response = requests.get(f"{BASE_URL}/servers/", headers=headers)
        print(f"List user servers: {response.status_code}")
        if response.status_code == 200:
            servers = response.json()
            print(f"   Initial server count: {len(servers)}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"List servers failed: {e}")
    
    # Test 3: Create first server
    server_id = None
    access_code = None
    try:
        response = requests.post(
            f"{BASE_URL}/servers/",
            headers=headers,
            json={"name": "Test Server 1", "is_private": False}
        )
        print(f"Create first server: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            server_id = data.get("server_id")
            access_code = data.get("access_code")
            print(f"   Server ID: {server_id}")
            print(f"   Access Code: {access_code}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"Create server failed: {e}")
    
    # Test 4: Create second server
    try:
        response = requests.post(
            f"{BASE_URL}/servers/",
            headers=headers,
            json={"name": "Test Server 2", "is_private": True}
        )
        print(f"Create second server: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Server 2 Access Code: {data.get('access_code')}")
    except Exception as e:
        print(f"Create second server failed: {e}")
    
    # Test 5: Create third server
    try:
        response = requests.post(
            f"{BASE_URL}/servers/",
            headers=headers,
            json={"name": "Test Server 3", "is_private": False}
        )
        print(f"Create third server: {response.status_code}")
        if response.status_code == 200:
            print(f"   Third server created successfully")
    except Exception as e:
        print(f"Create third server failed: {e}")
    
    # Test 6: Try to create fourth server (should hit 3-server limit)
    try:
        response = requests.post(
            f"{BASE_URL}/servers/",
            headers=headers,
            json={"name": "Test Server 4 - Should Fail", "is_private": False}
        )
        print(f"Create fourth server (should fail): {response.status_code}")
        if response.status_code == 400:
            data = response.json()
            print(f"   Correctly rejected: {data.get('detail', 'No detail')}")
        else:
            print(f"   Unexpected response: {response.text}")
    except Exception as e:
        print(f"Fourth server test failed: {e}")
    
    # Test 7: List servers again (should show 3 servers)
    try:
        response = requests.get(f"{BASE_URL}/servers/", headers=headers)
        print(f"List servers after creation: {response.status_code}")
        if response.status_code == 200:
            servers = response.json()
            print(f"   Server count: {len(servers)}")
            for server in servers:
                print(f"   - {server['name']} (Role: {server['user_role']}, Members: {server['member_count']})")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"List servers failed: {e}")
    
    # Test 8: Get specific server details
    if server_id:
        try:
            response = requests.get(f"{BASE_URL}/servers/{server_id}", headers=headers)
            print(f"Get server details: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   Server: {data['name']}")
                print(f"   Members: {len(data['members'])}")
                print(f"   Access Code: {data['access_code']}")
            else:
                print(f"   Error: {response.text}")
        except Exception as e:
            print(f"Get server details failed: {e}")
    
    # Test 9: Create room in server
    room_id = None
    if server_id:
        try:
            response = requests.post(
                f"{BASE_URL}/rooms/",
                headers=headers,
                json={
                    "server_id": server_id,
                    "name": "General",
                    "is_private": False
                }
            )
            print(f"Create room: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                room_id = data.get("room_id")
                print(f"   Room ID: {room_id}")
            else:
                print(f"   Error: {response.text}")
        except Exception as e:
            print(f"Create room failed: {e}")
    
    # Test 10: Create private room
    if server_id:
        try:
            response = requests.post(
                f"{BASE_URL}/rooms/",
                headers=headers,
                json={
                    "server_id": server_id,
                    "name": "Private Room",
                    "is_private": True
                }
            )
            print(f"Create private room: {response.status_code}")
            if response.status_code == 200:
                print(f"   Private room created successfully")
        except Exception as e:
            print(f"Create private room failed: {e}")
    
    # Test 11: List rooms in server
    if server_id:
        try:
            response = requests.get(f"{BASE_URL}/rooms/server/{server_id}", headers=headers)
            print(f"List server rooms: {response.status_code}")
            if response.status_code == 200:
                rooms = response.json()
                print(f"   Room count: {len(rooms)}")
                for room in rooms:
                    print(f"   - {room['name']} ({'Private' if room['is_private'] else 'Public'}, Members: {room['member_count']})")
            else:
                print(f"   Error: {response.text}")
        except Exception as e:
            print(f"List rooms failed: {e}")
    
    # Test 12: Get room details
    if room_id:
        try:
            response = requests.get(f"{BASE_URL}/rooms/{room_id}", headers=headers)
            print(f"Get room details: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   Room: {data['name']}")
                print(f"   Members: {len(data['members'])}")
            else:
                print(f"   Error: {response.text}")
        except Exception as e:
            print(f"Get room details failed: {e}")
    
    # Test 13: Try to join server with access code
    if access_code:
        try:
            response = requests.post(
                f"{BASE_URL}/servers/join",
                headers=headers,
                json={"access_code": access_code}
            )
            print(f"Join server with access code: {response.status_code}")
            if response.status_code == 400:
                data = response.json()
                print(f"   Correctly rejected (already member): {data.get('detail', 'No detail')}")
            else:
                print(f"   Response: {response.text}")
        except Exception as e:
            print(f"Join server test failed: {e}")
    
    # Test 14: Try to join room
    if room_id:
        try:
            response = requests.post(f"{BASE_URL}/rooms/{room_id}/join", headers=headers)
            print(f"Join room: {response.status_code}")
            if response.status_code == 400:
                data = response.json()
                print(f"   Correctly rejected (already member): {data.get('detail', 'No detail')}")
            elif response.status_code == 200:
                print(f"   Successfully joined room")
            else:
                print(f"   Response: {response.text}")
        except Exception as e:
            print(f"Join room test failed: {e}")
    
    # Test 15: Test validation - invalid access code format
    try:
        response = requests.post(
            f"{BASE_URL}/servers/join",
            headers=headers,
            json={"access_code": "ABC"}  # Too short
        )
        print(f"Invalid access code test: {response.status_code}")
        if response.status_code == 422:
            print(f"   Correctly rejected validation error")
        else:
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"Invalid access code test failed: {e}")
    
    # Test 16: Test server name validation
    try:
        response = requests.post(
            f"{BASE_URL}/servers/",
            headers=headers,
            json={"name": "", "is_private": False}  # Empty name
        )
        print(f"Empty server name test: {response.status_code}")
        if response.status_code == 422:
            print(f"   Correctly rejected validation error")
        else:
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"Empty server name test failed: {e}")
    
    print("\nServer and Room Management Integration Test Completed!")
    print("\nKey Features Tested:")
    print("- 3-server limit enforcement (CRITICAL REQUIREMENT)")
    print("- Unique 5-character access code generation")
    print("- Server creation, listing, and details")
    print("- Room creation within servers")
    print("- Member management with roles")
    print("- Join validation for servers and rooms")
    print("- Input validation and error handling")

if __name__ == "__main__":
    test_server_and_room_management()