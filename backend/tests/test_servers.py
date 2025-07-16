import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app

client = TestClient(app)

class TestServersAPI:
    """Test suite for servers API endpoints"""
    
    @patch('app.auth.dependencies.get_current_user')
    def test_create_server_success(self, mock_get_current_user):
        """Test creating a server successfully"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock user has 0 servers (under limit)
            mock_db.query().filter().count.return_value = 0
            
            # Mock server creation
            mock_server = MagicMock()
            mock_server.id = "server-456"
            mock_server.access_code = "ABC12"
            mock_db.add.return_value = None
            mock_db.flush.return_value = None
            mock_db.commit.return_value = None
            
            mock_get_db.return_value = mock_db
            
            response = client.post(
                "/api/v1/servers/",
                json={"name": "Test Server", "is_private": False}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Server created successfully"
            assert "server_id" in data
            assert "access_code" in data
    
    @patch('app.auth.dependencies.get_current_user')
    def test_create_server_limit_exceeded(self, mock_get_current_user):
        """Test creating server when 3-server limit is reached"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock user has 3 servers (at limit)
            mock_db.query().filter().count.return_value = 3
            
            mock_get_db.return_value = mock_db
            
            response = client.post(
                "/api/v1/servers/",
                json={"name": "Test Server", "is_private": False}
            )
            
            assert response.status_code == 400
            data = response.json()
            assert "maximum limit of 3 servers" in data["detail"]
    
    @patch('app.auth.dependencies.get_current_user')
    def test_create_server_invalid_name(self, mock_get_current_user):
        """Test creating server with invalid name"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        response = client.post(
            "/api/v1/servers/",
            json={"name": "", "is_private": False}
        )
        
        assert response.status_code == 422  # Validation error
    
    @patch('app.auth.dependencies.get_current_user')
    def test_get_user_servers(self, mock_get_current_user):
        """Test getting user's servers"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock user server and server data
            mock_user_server = MagicMock()
            mock_user_server.role = "owner"
            
            mock_server = MagicMock()
            mock_server.id = "server-456"
            mock_server.name = "Test Server"
            mock_server.access_code = "ABC12"
            mock_server.is_private = False
            mock_server.created_by = "user-123"
            mock_server.created_at.isoformat.return_value = "2023-01-01T00:00:00"
            
            mock_db.query().join().filter().all.return_value = [(mock_user_server, mock_server)]
            mock_db.query().filter().count.return_value = 1  # Member count
            
            mock_get_db.return_value = mock_db
            
            response = client.get("/api/v1/servers/")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["name"] == "Test Server"
            assert data[0]["user_role"] == "owner"
    
    @patch('app.auth.dependencies.get_current_user')
    def test_join_server_success(self, mock_get_current_user):
        """Test joining server by access code"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock server exists
            mock_server = MagicMock()
            mock_server.id = "server-456"
            mock_server.name = "Test Server"
            mock_db.query().filter.return_value.first.side_effect = [
                mock_server,  # Server exists
                None  # User not already member
            ]
            
            mock_get_db.return_value = mock_db
            
            response = client.post(
                "/api/v1/servers/join",
                json={"access_code": "ABC12"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "Successfully joined server" in data["message"]
            assert data["server_id"] == "server-456"
    
    @patch('app.auth.dependencies.get_current_user')
    def test_join_server_invalid_code(self, mock_get_current_user):
        """Test joining server with invalid access code"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock server doesn't exist
            mock_db.query().filter.return_value.first.return_value = None
            
            mock_get_db.return_value = mock_db
            
            response = client.post(
                "/api/v1/servers/join",
                json={"access_code": "INVALID"}
            )
            
            assert response.status_code == 404
            data = response.json()
            assert "Invalid access code" in data["detail"]
    
    @patch('app.auth.dependencies.get_current_user')
    def test_join_server_already_member(self, mock_get_current_user):
        """Test joining server when already a member"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock server exists and user is already member
            mock_server = MagicMock()
            mock_server.id = "server-456"
            
            mock_existing_membership = MagicMock()
            
            mock_db.query().filter.return_value.first.side_effect = [
                mock_server,  # Server exists
                mock_existing_membership  # User already member
            ]
            
            mock_get_db.return_value = mock_db
            
            response = client.post(
                "/api/v1/servers/join",
                json={"access_code": "ABC12"}
            )
            
            assert response.status_code == 400
            data = response.json()
            assert "already a member" in data["detail"]
    
    @patch('app.auth.dependencies.get_current_user')
    def test_delete_server_owner_only(self, mock_get_current_user):
        """Test that only server owner can delete server"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock user is not owner (admin or member)
            mock_db.query().filter.return_value.first.return_value = None
            
            mock_get_db.return_value = mock_db
            
            response = client.delete("/api/v1/servers/server-456")
            
            assert response.status_code == 403
            data = response.json()
            assert "Only the server owner can delete" in data["detail"]
    
    @patch('app.auth.dependencies.get_current_user')
    def test_leave_server_owner_cannot_leave(self, mock_get_current_user):
        """Test that server owner cannot leave server"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock user is owner
            mock_user_server = MagicMock()
            mock_user_server.role = "owner"
            mock_db.query().filter.return_value.first.return_value = mock_user_server
            
            mock_get_db.return_value = mock_db
            
            response = client.post("/api/v1/servers/server-456/leave")
            
            assert response.status_code == 400
            data = response.json()
            assert "Server owner cannot leave" in data["detail"]
    
    @patch('app.auth.dependencies.get_current_user')
    def test_update_server_admin_permission(self, mock_get_current_user):
        """Test updating server with admin permission"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock user has admin permission
            mock_user_server = MagicMock()
            mock_user_server.role = "admin"
            
            mock_server = MagicMock()
            mock_server.id = "server-456"
            
            mock_db.query().filter.return_value.first.side_effect = [
                mock_user_server,  # User has permission
                mock_server  # Server exists
            ]
            
            mock_get_db.return_value = mock_db
            
            response = client.patch(
                "/api/v1/servers/server-456",
                json={"name": "Updated Server Name"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Server updated successfully"

class TestServerLimitEnforcement:
    """Test suite specifically for 3-server limit enforcement"""
    
    @patch('app.auth.dependencies.get_current_user')
    def test_server_limit_exactly_three(self, mock_get_current_user):
        """Test creating server when user has exactly 3 servers"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock user has exactly 3 servers
            mock_db.query().filter().count.return_value = 3
            
            mock_get_db.return_value = mock_db
            
            response = client.post(
                "/api/v1/servers/",
                json={"name": "Fourth Server", "is_private": False}
            )
            
            assert response.status_code == 400
            data = response.json()
            assert "maximum limit of 3 servers" in data["detail"]
            assert "delete a server" in data["detail"]
    
    @patch('app.auth.dependencies.get_current_user')
    def test_server_limit_under_three(self, mock_get_current_user):
        """Test creating server when user has less than 3 servers"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock user has 2 servers (under limit)
            mock_db.query().filter().count.return_value = 2
            
            # Mock successful server creation
            mock_server = MagicMock()
            mock_server.id = "server-456"
            mock_server.access_code = "ABC12"
            
            mock_get_db.return_value = mock_db
            
            response = client.post(
                "/api/v1/servers/",
                json={"name": "Third Server", "is_private": False}
            )
            
            assert response.status_code == 200

def test_access_code_validation():
    """Test access code validation in join request"""
    response = client.post(
        "/api/v1/servers/join",
        json={"access_code": "ABC"}  # Too short
    )
    
    assert response.status_code == 422  # Validation error
    
    response = client.post(
        "/api/v1/servers/join",
        json={"access_code": "ABCDEF"}  # Too long
    )
    
    assert response.status_code == 422  # Validation error

# Run tests with: pytest tests/test_servers.py -v