import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app
from app.models.friendship import FriendshipStatus
from app.services.friendship_service import FriendshipService
import json

client = TestClient(app)

class TestFriendsAPI:
    """Test suite for friends API endpoints"""
    
    @patch('app.auth.dependencies.get_current_user')
    def test_list_friends_empty(self, mock_get_current_user):
        """Test listing friends when user has no friends"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            mock_db.query().filter().all.return_value = []
            mock_get_db.return_value = mock_db
            
            response = client.get("/api/v1/friends/")
            
            assert response.status_code == 200
            assert response.json() == []
    
    @patch('app.auth.dependencies.get_current_user')
    def test_send_friend_request_success(self, mock_get_current_user):
        """Test sending a friend request successfully"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.services.user_service.UserService') as mock_user_service:
            mock_service = mock_user_service.return_value
            
            # Mock target user exists
            mock_target_user = MagicMock()
            mock_target_user.id = "user-456"
            mock_service.get_user_by_id.return_value = mock_target_user
            
            with patch('app.db.database.get_db') as mock_get_db:
                mock_db = MagicMock()
                mock_db.query().filter().first.return_value = None  # No existing friendship
                mock_get_db.return_value = mock_db
                
                response = client.post(
                    "/api/v1/friends/request",
                    json={"user_id": "user-456"}
                )
                
                assert response.status_code == 200
                data = response.json()
                assert data["message"] == "Friend request sent successfully"
                assert data["status"] == "pending"
    
    @patch('app.auth.dependencies.get_current_user')
    def test_send_friend_request_self(self, mock_get_current_user):
        """Test preventing self-friending"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        response = client.post(
            "/api/v1/friends/request",
            json={"user_id": "user-123"}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "cannot send a friend request to yourself" in data["detail"]
    
    @patch('app.auth.dependencies.get_current_user')
    def test_send_friend_request_user_not_found(self, mock_get_current_user):
        """Test sending friend request to non-existent user"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.services.user_service.UserService') as mock_user_service:
            mock_service = mock_user_service.return_value
            mock_service.get_user_by_id.return_value = None  # User not found
            
            response = client.post(
                "/api/v1/friends/request",
                json={"user_id": "user-999"}
            )
            
            assert response.status_code == 404
            data = response.json()
            assert "User not found" in data["detail"]
    
    @patch('app.auth.dependencies.get_current_user')
    def test_send_friend_request_already_friends(self, mock_get_current_user):
        """Test preventing duplicate friend requests when already friends"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.services.user_service.UserService') as mock_user_service:
            mock_service = mock_user_service.return_value
            
            mock_target_user = MagicMock()
            mock_target_user.id = "user-456"
            mock_service.get_user_by_id.return_value = mock_target_user
            
            with patch('app.db.database.get_db') as mock_get_db:
                mock_db = MagicMock()
                
                # Mock existing accepted friendship
                mock_friendship = MagicMock()
                mock_friendship.status = FriendshipStatus.ACCEPTED
                mock_db.query().filter().first.return_value = mock_friendship
                mock_get_db.return_value = mock_db
                
                response = client.post(
                    "/api/v1/friends/request",
                    json={"user_id": "user-456"}
                )
                
                assert response.status_code == 400
                data = response.json()
                assert "already friends" in data["detail"]
    
    @patch('app.auth.dependencies.get_current_user')
    def test_send_friend_request_already_pending(self, mock_get_current_user):
        """Test preventing duplicate friend requests when already pending"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.services.user_service.UserService') as mock_user_service:
            mock_service = mock_user_service.return_value
            
            mock_target_user = MagicMock()
            mock_target_user.id = "user-456"
            mock_service.get_user_by_id.return_value = mock_target_user
            
            with patch('app.db.database.get_db') as mock_get_db:
                mock_db = MagicMock()
                
                # Mock existing pending friendship
                mock_friendship = MagicMock()
                mock_friendship.status = FriendshipStatus.PENDING
                mock_db.query().filter().first.return_value = mock_friendship
                mock_get_db.return_value = mock_db
                
                response = client.post(
                    "/api/v1/friends/request",
                    json={"user_id": "user-456"}
                )
                
                assert response.status_code == 400
                data = response.json()
                assert "already pending" in data["detail"]
    
    @patch('app.auth.dependencies.get_current_user')
    def test_send_friend_request_by_username(self, mock_get_current_user):
        """Test sending friend request by username"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.services.user_service.UserService') as mock_user_service:
            mock_service = mock_user_service.return_value
            
            # Mock finding user by username
            mock_target_user = MagicMock()
            mock_target_user.id = "user-456"
            mock_service.get_user_by_username.return_value = mock_target_user
            
            with patch('app.db.database.get_db') as mock_get_db:
                mock_db = MagicMock()
                mock_db.query().filter().first.return_value = None
                mock_get_db.return_value = mock_db
                
                response = client.post(
                    "/api/v1/friends/request-by-identifier",
                    json={"identifier": "testuser"}
                )
                
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "pending"
    
    @patch('app.auth.dependencies.get_current_user')
    def test_send_friend_request_by_email(self, mock_get_current_user):
        """Test sending friend request by email"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.services.user_service.UserService') as mock_user_service:
            mock_service = mock_user_service.return_value
            
            # Mock user not found by username, but found by email
            mock_service.get_user_by_username.return_value = None
            
            mock_target_user = MagicMock()
            mock_target_user.id = "user-456"
            mock_service.get_user_by_email.return_value = mock_target_user
            
            with patch('app.db.database.get_db') as mock_get_db:
                mock_db = MagicMock()
                mock_db.query().filter().first.return_value = None
                mock_get_db.return_value = mock_db
                
                response = client.post(
                    "/api/v1/friends/request-by-identifier",
                    json={"identifier": "test@example.com"}
                )
                
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "pending"
    
    @patch('app.auth.dependencies.get_current_user')
    def test_list_friend_requests(self, mock_get_current_user):
        """Test listing pending friend requests"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock pending request
            mock_friendship = MagicMock()
            mock_friendship.id = "friendship-123"
            mock_friendship.status = "pending"
            mock_friendship.created_at.isoformat.return_value = "2023-01-01T00:00:00"
            mock_friendship.accepted_at = None
            
            # Mock requester
            mock_requester = MagicMock()
            mock_requester.id = "user-456"
            mock_requester.username = "requester"
            mock_requester.picture_url = None
            mock_requester.external_link = None
            mock_requester.user_type = "human"
            mock_requester.created_at.isoformat.return_value = "2023-01-01T00:00:00"
            mock_friendship.requester = mock_requester
            
            # Mock friend (current user)
            mock_friendship.friend = mock_user
            mock_user.username = "currentuser"
            mock_user.picture_url = None
            mock_user.external_link = None
            mock_user.user_type = "human"
            mock_user.created_at.isoformat.return_value = "2023-01-01T00:00:00"
            
            mock_db.query().filter().all.return_value = [mock_friendship]
            mock_get_db.return_value = mock_db
            
            response = client.get("/api/v1/friends/requests")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["status"] == "pending"
            assert data[0]["requester"]["username"] == "requester"
    
    @patch('app.auth.dependencies.get_current_user')
    def test_accept_friend_request(self, mock_get_current_user):
        """Test accepting a friend request"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock friendship to accept
            mock_friendship = MagicMock()
            mock_friendship.status = FriendshipStatus.PENDING
            mock_friendship.requester = MagicMock()
            mock_db.query().filter().first.return_value = mock_friendship
            mock_get_db.return_value = mock_db
            
            response = client.post("/api/v1/friends/accept/friendship-123")
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Friend request accepted"
            assert data["status"] == "accepted"
    
    @patch('app.auth.dependencies.get_current_user')
    def test_reject_friend_request(self, mock_get_current_user):
        """Test rejecting a friend request"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock friendship to reject
            mock_friendship = MagicMock()
            mock_friendship.status = FriendshipStatus.PENDING
            mock_db.query().filter().first.return_value = mock_friendship
            mock_get_db.return_value = mock_db
            
            response = client.post("/api/v1/friends/reject/friendship-123")
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Friend request rejected"
            assert data["status"] == "rejected"
    
    @patch('app.auth.dependencies.get_current_user')
    def test_remove_friend(self, mock_get_current_user):
        """Test removing a friend"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock friendship to remove
            mock_friendship = MagicMock()
            mock_friendship.status = FriendshipStatus.ACCEPTED
            mock_friendship.user_id = "user-123"
            mock_friendship.friend = MagicMock()
            mock_db.query().filter().first.return_value = mock_friendship
            mock_get_db.return_value = mock_db
            
            response = client.delete("/api/v1/friends/user-456")
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Friend removed successfully"
            assert data["status"] == "removed"
    
    @patch('app.auth.dependencies.get_current_user')
    def test_get_friendship_status_none(self, mock_get_current_user):
        """Test getting friendship status when no friendship exists"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            mock_db.query().filter().first.return_value = None
            mock_get_db.return_value = mock_db
            
            response = client.get("/api/v1/friends/status/user-456")
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "none"
            assert data["can_send_request"] is True
    
    @patch('app.auth.dependencies.get_current_user')
    def test_get_friendship_status_pending(self, mock_get_current_user):
        """Test getting friendship status when request is pending"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            mock_friendship = MagicMock()
            mock_friendship.status = "pending"
            mock_friendship.user_id = "user-123"  # Current user is requester
            mock_friendship.created_at.isoformat.return_value = "2023-01-01T00:00:00"
            mock_friendship.accepted_at = None
            mock_db.query().filter().first.return_value = mock_friendship
            mock_get_db.return_value = mock_db
            
            response = client.get("/api/v1/friends/status/user-456")
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "pending"
            assert data["is_requester"] is True
            assert data["can_send_request"] is False
    
    @patch('app.auth.dependencies.get_current_user')
    def test_block_user(self, mock_get_current_user):
        """Test blocking a user"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.services.user_service.UserService') as mock_user_service:
            mock_service = mock_user_service.return_value
            mock_target_user = MagicMock()
            mock_service.get_user_by_id.return_value = mock_target_user
            
            with patch('app.services.friendship_service.FriendshipService') as mock_friendship_service:
                mock_fs = mock_friendship_service.return_value
                mock_fs.block_user.return_value = True
                
                response = client.post("/api/v1/friends/block/user-456")
                
                assert response.status_code == 200
                data = response.json()
                assert data["message"] == "User blocked successfully"
                assert data["status"] == "blocked"
    
    @patch('app.auth.dependencies.get_current_user')
    def test_block_self(self, mock_get_current_user):
        """Test preventing self-blocking"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        response = client.post("/api/v1/friends/block/user-123")
        
        assert response.status_code == 400
        data = response.json()
        assert "cannot block yourself" in data["detail"]
    
    @patch('app.auth.dependencies.get_current_user')
    def test_unblock_user(self, mock_get_current_user):
        """Test unblocking a user"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.services.user_service.UserService') as mock_user_service:
            mock_service = mock_user_service.return_value
            mock_target_user = MagicMock()
            mock_service.get_user_by_id.return_value = mock_target_user
            
            with patch('app.services.friendship_service.FriendshipService') as mock_friendship_service:
                mock_fs = mock_friendship_service.return_value
                mock_fs.unblock_user.return_value = True
                
                response = client.post("/api/v1/friends/unblock/user-456")
                
                assert response.status_code == 200
                data = response.json()
                assert data["message"] == "User unblocked successfully"
                assert data["status"] == "unblocked"

class TestFriendshipService:
    """Test suite for friendship service"""
    
    def test_are_friends_true(self):
        """Test are_friends returns True for accepted friendship"""
        mock_db = MagicMock()
        mock_friendship = MagicMock()
        mock_db.query().filter().first.return_value = mock_friendship
        
        service = FriendshipService(mock_db)
        result = service.are_friends("user1", "user2")
        
        assert result is True
    
    def test_are_friends_false(self):
        """Test are_friends returns False when no friendship exists"""
        mock_db = MagicMock()
        mock_db.query().filter().first.return_value = None
        
        service = FriendshipService(mock_db)
        result = service.are_friends("user1", "user2")
        
        assert result is False
    
    def test_can_send_dm_friends(self):
        """Test can_send_dm returns True for friends"""
        mock_db = MagicMock()
        
        service = FriendshipService(mock_db)
        
        # Mock no blocking
        mock_db.query().filter().first.side_effect = [None, MagicMock()]  # No block, then friendship
        
        with patch.object(service, 'are_friends', return_value=True):
            can_send, reason = service.can_send_dm("user1", "user2")
            
            assert can_send is True
            assert "friends" in reason
    
    def test_can_send_dm_same_server(self):
        """Test can_send_dm returns True for users in same server"""
        mock_db = MagicMock()
        
        service = FriendshipService(mock_db)
        
        # Mock no blocking, not friends, but in same server
        mock_db.query().filter().first.side_effect = [None]  # No block
        
        with patch.object(service, 'are_friends', return_value=False):
            with patch.object(service, 'are_in_same_server', return_value=True):
                can_send, reason = service.can_send_dm("user1", "user2")
                
                assert can_send is True
                assert "same server" in reason
    
    def test_can_send_dm_blocked(self):
        """Test can_send_dm returns False when blocked"""
        mock_db = MagicMock()
        
        service = FriendshipService(mock_db)
        
        # Mock blocking relationship exists
        mock_blocking = MagicMock()
        mock_db.query().filter().first.return_value = mock_blocking
        
        can_send, reason = service.can_send_dm("user1", "user2")
        
        assert can_send is False
        assert "blocked" in reason
    
    def test_can_send_dm_not_allowed(self):
        """Test can_send_dm returns False when not friends and not in same server"""
        mock_db = MagicMock()
        
        service = FriendshipService(mock_db)
        
        # Mock no blocking, not friends, not in same server
        mock_db.query().filter().first.side_effect = [None]  # No block
        
        with patch.object(service, 'are_friends', return_value=False):
            with patch.object(service, 'are_in_same_server', return_value=False):
                can_send, reason = service.can_send_dm("user1", "user2")
                
                assert can_send is False
                assert "not friends" in reason and "not in the same server" in reason

# Run tests with: pytest tests/test_friends.py -v