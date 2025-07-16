import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app

client = TestClient(app)

class TestRoomsAPI:
    """Test suite for rooms API endpoints"""
    
    @patch('app.auth.dependencies.get_current_user')
    def test_create_room_success(self, mock_get_current_user):
        """Test creating a room successfully"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock user has admin permission in server
            mock_user_server = MagicMock()
            mock_user_server.role = "admin"
            
            # Mock server exists
            mock_server = MagicMock()
            mock_server.id = "server-456"
            
            # Mock no existing room with same name
            mock_db.query().filter.return_value.first.side_effect = [
                mock_user_server,  # User has permission
                mock_server,  # Server exists
                None  # No existing room with same name
            ]
            
            # Mock room creation
            mock_room = MagicMock()
            mock_room.id = "room-789"
            mock_db.add.return_value = None
            mock_db.flush.return_value = None
            mock_db.commit.return_value = None
            
            mock_get_db.return_value = mock_db
            
            response = client.post(
                "/api/v1/rooms/",
                json={
                    "server_id": "server-456",
                    "name": "General",
                    "is_private": False
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Room created successfully"
            assert "room_id" in data
    
    @patch('app.auth.dependencies.get_current_user')
    def test_create_room_no_permission(self, mock_get_current_user):
        """Test creating room without admin/owner permission"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock user has no admin/owner permission
            mock_db.query().filter.return_value.first.return_value = None
            
            mock_get_db.return_value = mock_db
            
            response = client.post(
                "/api/v1/rooms/",
                json={
                    "server_id": "server-456",
                    "name": "General",
                    "is_private": False
                }
            )
            
            assert response.status_code == 403
            data = response.json()
            assert "don't have permission to create rooms" in data["detail"]
    
    @patch('app.auth.dependencies.get_current_user')
    def test_create_room_duplicate_name(self, mock_get_current_user):
        """Test creating room with duplicate name in server"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock user has permission
            mock_user_server = MagicMock()
            mock_user_server.role = "owner"
            
            # Mock server exists
            mock_server = MagicMock()
            
            # Mock existing room with same name
            mock_existing_room = MagicMock()
            
            mock_db.query().filter.return_value.first.side_effect = [
                mock_user_server,  # User has permission
                mock_server,  # Server exists
                mock_existing_room  # Room with same name exists
            ]
            
            mock_get_db.return_value = mock_db
            
            response = client.post(
                "/api/v1/rooms/",
                json={
                    "server_id": "server-456",
                    "name": "General",
                    "is_private": False
                }
            )
            
            assert response.status_code == 400
            data = response.json()
            assert "room with this name already exists" in data["detail"]
    
    @patch('app.auth.dependencies.get_current_user')
    def test_get_server_rooms(self, mock_get_current_user):
        """Test getting all rooms in a server"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock user is server member
            mock_user_server = MagicMock()
            mock_user_server.role = "member"
            
            # Mock rooms in server
            mock_room1 = MagicMock()
            mock_room1.id = "room-1"
            mock_room1.server_id = "server-456"
            mock_room1.name = "General"
            mock_room1.is_private = False
            mock_room1.created_by = "user-123"
            mock_room1.created_at.isoformat.return_value = "2023-01-01T00:00:00"
            
            mock_room2 = MagicMock()
            mock_room2.id = "room-2"
            mock_room2.server_id = "server-456"
            mock_room2.name = "Private Room"
            mock_room2.is_private = True
            mock_room2.created_by = "user-456"
            mock_room2.created_at.isoformat.return_value = "2023-01-01T00:00:00"
            
            mock_user_room = MagicMock()
            mock_user_room.role = "member"
            
            mock_db.query().filter.return_value.first.side_effect = [
                mock_user_server,  # User is server member
                mock_user_room,  # User is room member (for first room)
                None  # User not member of private room
            ]
            
            mock_db.query().filter.return_value.all.return_value = [mock_room1, mock_room2]
            mock_db.query().filter.return_value.count.return_value = 5  # Member count
            
            mock_get_db.return_value = mock_db
            
            response = client.get("/api/v1/rooms/server/server-456")
            
            assert response.status_code == 200
            data = response.json()
            # Should only return public room since user not member of private room
            assert len(data) == 1
            assert data[0]["name"] == "General"
    
    @patch('app.auth.dependencies.get_current_user')
    def test_join_room_success(self, mock_get_current_user):
        """Test joining a public room successfully"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock room exists and is public
            mock_room = MagicMock()
            mock_room.id = "room-789"
            mock_room.name = "General"
            mock_room.server_id = "server-456"
            mock_room.is_private = False
            
            # Mock user is server member
            mock_user_server = MagicMock()
            
            mock_db.query().filter.return_value.first.side_effect = [
                mock_room,  # Room exists
                mock_user_server,  # User is server member
                None  # User not already room member
            ]
            
            mock_get_db.return_value = mock_db
            
            response = client.post("/api/v1/rooms/room-789/join")
            
            assert response.status_code == 200
            data = response.json()
            assert "Successfully joined room" in data["message"]
            assert data["room_id"] == "room-789"
    
    @patch('app.auth.dependencies.get_current_user')
    def test_join_private_room_denied(self, mock_get_current_user):
        """Test joining private room is denied"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock room exists and is private
            mock_room = MagicMock()
            mock_room.id = "room-789"
            mock_room.server_id = "server-456"
            mock_room.is_private = True
            
            # Mock user is server member
            mock_user_server = MagicMock()
            
            mock_db.query().filter.return_value.first.side_effect = [
                mock_room,  # Room exists
                mock_user_server,  # User is server member
                None  # User not already room member
            ]
            
            mock_get_db.return_value = mock_db
            
            response = client.post("/api/v1/rooms/room-789/join")
            
            assert response.status_code == 403
            data = response.json()
            assert "Cannot join private room" in data["detail"]
    
    @patch('app.auth.dependencies.get_current_user')
    def test_join_room_not_server_member(self, mock_get_current_user):
        """Test joining room when not server member"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock room exists
            mock_room = MagicMock()
            mock_room.id = "room-789"
            mock_room.server_id = "server-456"
            
            mock_db.query().filter.return_value.first.side_effect = [
                mock_room,  # Room exists
                None  # User not server member
            ]
            
            mock_get_db.return_value = mock_db
            
            response = client.post("/api/v1/rooms/room-789/join")
            
            assert response.status_code == 403
            data = response.json()
            assert "must be a server member" in data["detail"]
    
    @patch('app.auth.dependencies.get_current_user')
    def test_update_room_success(self, mock_get_current_user):
        """Test updating room by owner"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock user is room owner
            mock_user_room = MagicMock()
            mock_user_room.role = "owner"
            
            # Mock room exists
            mock_room = MagicMock()
            mock_room.id = "room-789"
            mock_room.server_id = "server-456"
            
            # Mock no existing room with new name
            mock_db.query().filter.return_value.first.side_effect = [
                mock_user_room,  # User has room permission
                mock_room,  # Room exists
                None  # No existing room with new name
            ]
            
            mock_get_db.return_value = mock_db
            
            response = client.patch(
                "/api/v1/rooms/room-789",
                json={"name": "Updated Room Name"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Room updated successfully"
    
    @patch('app.auth.dependencies.get_current_user')
    def test_update_room_by_server_admin(self, mock_get_current_user):
        """Test updating room by server admin"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock room exists
            mock_room = MagicMock()
            mock_room.id = "room-789"
            mock_room.server_id = "server-456"
            
            # Mock user is server admin (not room member)
            mock_user_server = MagicMock()
            mock_user_server.role = "admin"
            
            mock_db.query().filter.return_value.first.side_effect = [
                None,  # User not room owner/admin
                mock_room,  # Room exists
                mock_user_server,  # User is server admin
                None  # No existing room with new name
            ]
            
            mock_get_db.return_value = mock_db
            
            response = client.patch(
                "/api/v1/rooms/room-789",
                json={"name": "Updated by Server Admin"}
            )
            
            assert response.status_code == 200
    
    @patch('app.auth.dependencies.get_current_user')
    def test_delete_room_owner_only(self, mock_get_current_user):
        """Test deleting room by owner"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock room exists
            mock_room = MagicMock()
            mock_room.id = "room-789"
            mock_room.server_id = "server-456"
            
            # Mock user is room owner
            mock_user_room = MagicMock()
            mock_user_room.role = "owner"
            
            mock_db.query().filter.return_value.first.side_effect = [
                mock_room,  # Room exists
                mock_user_room,  # User is room owner
                None  # No server admin check needed
            ]
            
            mock_get_db.return_value = mock_db
            
            response = client.delete("/api/v1/rooms/room-789")
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Room deleted successfully"
    
    @patch('app.auth.dependencies.get_current_user')
    def test_leave_room_owner_cannot_leave(self, mock_get_current_user):
        """Test that room owner cannot leave room"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock user is room owner
            mock_user_room = MagicMock()
            mock_user_room.role = "owner"
            mock_db.query().filter.return_value.first.return_value = mock_user_room
            
            mock_get_db.return_value = mock_db
            
            response = client.post("/api/v1/rooms/room-789/leave")
            
            assert response.status_code == 400
            data = response.json()
            assert "Room owner cannot leave" in data["detail"]
    
    @patch('app.auth.dependencies.get_current_user')
    def test_get_room_with_members(self, mock_get_current_user):
        """Test getting room details with member list"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock room exists and is public
            mock_room = MagicMock()
            mock_room.id = "room-789"
            mock_room.server_id = "server-456"
            mock_room.name = "General"
            mock_room.is_private = False
            mock_room.created_by = "user-123"
            mock_room.created_at.isoformat.return_value = "2023-01-01T00:00:00"
            
            # Mock user is server member
            mock_user_server = MagicMock()
            
            # Mock room members
            mock_user_room = MagicMock()
            mock_user_room.role = "owner"
            mock_user_room.joined_at.isoformat.return_value = "2023-01-01T00:00:00"
            mock_user_room.last_read_at = None
            
            mock_member_user = MagicMock()
            mock_member_user.id = "user-123"
            mock_member_user.username = "testuser"
            mock_member_user.picture_url = None
            mock_member_user.user_type = "human"
            
            mock_db.query().filter.return_value.first.side_effect = [
                mock_room,  # Room exists
                None,  # User room membership (for access check)
                mock_user_server  # User is server member
            ]
            
            mock_db.query().join().filter.return_value.all.return_value = [
                (mock_user_room, mock_member_user)
            ]
            
            mock_get_db.return_value = mock_db
            
            response = client.get("/api/v1/rooms/room-789")
            
            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "General"
            assert len(data["members"]) == 1
            assert data["members"][0]["username"] == "testuser"

class TestRoomValidation:
    """Test suite for room validation"""
    
    def test_create_room_invalid_name(self):
        """Test creating room with invalid name"""
        response = client.post(
            "/api/v1/rooms/",
            json={
                "server_id": "server-456",
                "name": "",  # Empty name
                "is_private": False
            }
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_create_room_missing_server_id(self):
        """Test creating room without server_id"""
        response = client.post(
            "/api/v1/rooms/",
            json={
                "name": "General",
                "is_private": False
            }
        )
        
        assert response.status_code == 422  # Validation error

# Run tests with: pytest tests/test_rooms.py -v