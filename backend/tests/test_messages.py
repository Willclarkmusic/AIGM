import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app

client = TestClient(app)

class TestMessagesAPI:
    """Test suite for messages API endpoints"""
    
    @patch('app.auth.dependencies.get_current_user')
    def test_create_room_message_success(self, mock_get_current_user):
        """Test creating a room message successfully"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_user.username = "testuser"
        mock_user.picture_url = None
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock room exists and user has access
            mock_room = MagicMock()
            mock_room.id = "room-456"
            mock_room.is_private = False
            mock_room.server_id = "server-789"
            
            mock_user_server = MagicMock()
            
            mock_db.query().filter.return_value.first.side_effect = [
                mock_room,  # Room exists
                None,  # No user room (but user is server member)
                mock_user_server  # User is server member
            ]
            
            # Mock message creation
            mock_message = MagicMock()
            mock_message.id = "message-123"
            mock_message.content = "Hello world"
            mock_message.created_at.isoformat.return_value = "2023-01-01T00:00:00"
            
            mock_get_db.return_value = mock_db
            
            response = client.post(
                "/api/v1/messages/",
                json={\n                    "content": "Hello world",\n                    "room_id": "room-456"\n                }\n            )\n            \n            assert response.status_code == 200\n            data = response.json()\n            assert data["content"] == "Hello world"\n            assert data["room_id"] == "room-456"\n    \n    @patch('app.auth.dependencies.get_current_user')\n    def test_create_dm_message_success(self, mock_get_current_user):\n        """Test creating a DM message successfully"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_user.username = "testuser"
        mock_user.picture_url = None
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock conversation exists and user is member
            mock_conversation = MagicMock()
            mock_conversation.id = "conv-456"
            
            mock_member = MagicMock()
            
            mock_db.query().filter.return_value.first.side_effect = [
                mock_conversation,  # Conversation exists
                mock_member  # User is member
            ]
            
            mock_get_db.return_value = mock_db
            
            response = client.post(
                "/api/v1/messages/",
                json={
                    "content": "Hello DM",
                    "conversation_id": "conv-456"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["content"] == "Hello DM"
            assert data["conversation_id"] == "conv-456"
    
    @patch('app.auth.dependencies.get_current_user')
    def test_create_message_with_reply(self, mock_get_current_user):
        """Test creating a message as reply to another message"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_user.username = "testuser"
        mock_user.picture_url = None
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock room and parent message
            mock_room = MagicMock()
            mock_room.id = "room-456"
            mock_room.is_private = False
            mock_room.server_id = "server-789"
            
            mock_parent_message = MagicMock()
            mock_parent_message.id = "parent-123"
            mock_parent_message.room_id = "room-456"
            
            mock_user_server = MagicMock()
            
            mock_db.query().filter.return_value.first.side_effect = [
                mock_room,  # Room exists
                None,  # No user room
                mock_user_server,  # User is server member
                mock_parent_message  # Parent message exists
            ]
            
            mock_get_db.return_value = mock_db
            
            response = client.post(
                "/api/v1/messages/",
                json={
                    "content": "This is a reply",
                    "room_id": "room-456",
                    "parent_message_id": "parent-123"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["content"] == "This is a reply"
            assert data["parent_message_id"] == "parent-123"
    
    @patch('app.auth.dependencies.get_current_user')
    def test_create_message_no_access(self, mock_get_current_user):
        """Test creating message without room access"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock room exists but user has no access
            mock_room = MagicMock()
            mock_room.id = "room-456"
            mock_room.is_private = False
            mock_room.server_id = "server-789"
            
            mock_db.query().filter.return_value.first.side_effect = [
                mock_room,  # Room exists
                None,  # No user room
                None  # No user server
            ]
            
            mock_get_db.return_value = mock_db
            
            response = client.post(
                "/api/v1/messages/",
                json={
                    "content": "Hello world",
                    "room_id": "room-456"
                }
            )
            
            assert response.status_code == 403
            data = response.json()
            assert "don't have access" in data["detail"]
    
    @patch('app.auth.dependencies.get_current_user')
    def test_get_room_messages_with_pagination(self, mock_get_current_user):
        """Test getting room messages with pagination"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock room access
            mock_room = MagicMock()
            mock_room.id = "room-456"
            mock_room.is_private = False
            mock_room.server_id = "server-789"
            
            mock_user_server = MagicMock()
            
            # Mock messages
            mock_message1 = MagicMock()
            mock_message1.id = "msg-1"
            mock_message1.content = "Message 1"
            mock_message1.user_id = "user-123"
            mock_message1.room_id = "room-456"
            mock_message1.conversation_id = None
            mock_message1.parent_message_id = None
            mock_message1.created_at.isoformat.return_value = "2023-01-01T00:00:00"
            mock_message1.edited_at = None
            mock_message1.user.username = "testuser"
            mock_message1.user.picture_url = None
            
            mock_db.query().filter.return_value.first.side_effect = [
                mock_room,  # Room exists
                None,  # No user room
                mock_user_server  # User is server member
            ]
            
            # Mock message query
            mock_query = MagicMock()
            mock_query.limit.return_value.all.return_value = [mock_message1]
            mock_db.query().filter().order_by.return_value = mock_query
            
            # Mock file and reaction queries
            mock_db.query().filter().all.return_value = []  # No files/reactions
            mock_db.query().filter().count.return_value = 0  # No replies
            
            mock_get_db.return_value = mock_db
            
            response = client.get("/api/v1/messages/room/room-456?limit=50")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["content"] == "Message 1"
    
    @patch('app.auth.dependencies.get_current_user')
    def test_update_message_success(self, mock_get_current_user):
        """Test updating own message"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_user.username = "testuser"
        mock_user.picture_url = None
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock message exists and user is author
            mock_message = MagicMock()
            mock_message.id = "msg-123"
            mock_message.user_id = "user-123"
            mock_message.content = "Updated content"
            mock_message.room_id = "room-456"
            mock_message.conversation_id = None
            mock_message.parent_message_id = None
            mock_message.created_at.isoformat.return_value = "2023-01-01T00:00:00"
            mock_message.edited_at.isoformat.return_value = "2023-01-01T01:00:00"
            mock_message.user.username = "testuser"
            mock_message.user.picture_url = None
            
            mock_db.query().filter.return_value.first.return_value = mock_message
            
            # Mock file and reaction queries for formatting
            mock_db.query().filter().all.return_value = []
            mock_db.query().filter().count.return_value = 0
            
            mock_get_db.return_value = mock_db
            
            response = client.patch(
                "/api/v1/messages/msg-123",
                json={"content": "Updated content"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["content"] == "Updated content"
            assert data["edited_at"] is not None
    
    @patch('app.auth.dependencies.get_current_user')
    def test_update_message_not_author(self, mock_get_current_user):
        """Test updating message when not author"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock message exists but user is not author
            mock_message = MagicMock()
            mock_message.id = "msg-123"
            mock_message.user_id = "user-456"  # Different user
            
            mock_db.query().filter.return_value.first.return_value = mock_message
            mock_get_db.return_value = mock_db
            
            response = client.patch(
                "/api/v1/messages/msg-123",
                json={"content": "Updated content"}
            )
            
            assert response.status_code == 403
            data = response.json()
            assert "only edit your own messages" in data["detail"]
    
    @patch('app.auth.dependencies.get_current_user')
    def test_delete_message_success(self, mock_get_current_user):
        """Test deleting own message"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock message exists and user is author
            mock_message = MagicMock()
            mock_message.id = "msg-123"
            mock_message.user_id = "user-123"
            mock_message.room_id = "room-456"
            mock_message.conversation_id = None
            
            mock_db.query().filter.return_value.first.return_value = mock_message
            mock_get_db.return_value = mock_db
            
            response = client.delete("/api/v1/messages/msg-123")
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Message deleted successfully"
            assert data["message_id"] == "msg-123"
    
    @patch('app.auth.dependencies.get_current_user')
    def test_add_reaction_success(self, mock_get_current_user):
        """Test adding emoji reaction to message"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_user.username = "testuser"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock message and access validation
            mock_message = MagicMock()
            mock_message.id = "msg-123"
            mock_message.room_id = "room-456"
            mock_message.conversation_id = None
            
            # Mock no existing reaction
            mock_db.query().filter.return_value.first.side_effect = [
                mock_message,  # Message exists
                mock_room := MagicMock(),  # Room validation
                None,  # No user room
                mock_user_server := MagicMock(),  # User server access
                None  # No existing reaction
            ]
            
            mock_room.is_private = False
            mock_room.server_id = "server-789"
            
            mock_get_db.return_value = mock_db
            
            response = client.post(
                "/api/v1/messages/msg-123/react",
                json={"emoji": "👍"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Reaction added successfully"
    
    @patch('app.auth.dependencies.get_current_user')
    def test_add_reaction_already_exists(self, mock_get_current_user):
        """Test adding reaction when already reacted with same emoji"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock message and existing reaction
            mock_message = MagicMock()
            mock_message.id = "msg-123"
            mock_message.room_id = "room-456"
            mock_message.conversation_id = None
            
            mock_existing_reaction = MagicMock()
            
            mock_db.query().filter.return_value.first.side_effect = [
                mock_message,  # Message exists
                mock_room := MagicMock(),  # Room validation
                None,  # No user room
                mock_user_server := MagicMock(),  # User server access
                mock_existing_reaction  # Existing reaction
            ]
            
            mock_room.is_private = False
            mock_room.server_id = "server-789"
            
            mock_get_db.return_value = mock_db
            
            response = client.post(
                "/api/v1/messages/msg-123/react",
                json={"emoji": "👍"}
            )
            
            assert response.status_code == 400
            data = response.json()
            assert "already reacted" in data["detail"]
    
    @patch('app.auth.dependencies.get_current_user')
    def test_remove_reaction_success(self, mock_get_current_user):
        """Test removing emoji reaction from message"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock message and existing reaction
            mock_message = MagicMock()
            mock_message.id = "msg-123"
            mock_message.room_id = "room-456"
            mock_message.conversation_id = None
            
            mock_reaction = MagicMock()
            
            mock_db.query().filter.return_value.first.side_effect = [
                mock_message,  # Message exists
                mock_room := MagicMock(),  # Room validation
                None,  # No user room
                mock_user_server := MagicMock(),  # User server access
                mock_reaction  # Existing reaction
            ]
            
            mock_room.is_private = False
            mock_room.server_id = "server-789"
            
            mock_get_db.return_value = mock_db
            
            response = client.delete(
                "/api/v1/messages/msg-123/react",
                json={"emoji": "👍"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Reaction removed successfully"
    
    @patch('app.auth.dependencies.get_current_user')
    def test_typing_indicators(self, mock_get_current_user):
        """Test typing start/stop indicators"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_user.username = "testuser"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock room access for typing
            mock_room = MagicMock()
            mock_room.is_private = False
            mock_room.server_id = "server-789"
            
            mock_user_server = MagicMock()
            
            mock_db.query().filter.return_value.first.side_effect = [
                mock_room,  # Room exists
                None,  # No user room
                mock_user_server  # User server access
            ]
            
            mock_get_db.return_value = mock_db
            
            # Test typing start
            response = client.post(
                "/api/v1/messages/typing/start",
                json={"room_id": "room-456"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Typing indicator started"
            
            # Reset mock side effects for stop test
            mock_db.query().filter.return_value.first.side_effect = [
                mock_room,  # Room exists
                None,  # No user room
                mock_user_server  # User server access
            ]
            
            # Test typing stop
            response = client.post(
                "/api/v1/messages/typing/stop",
                json={"room_id": "room-456"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Typing indicator stopped"

class TestMessageValidation:
    """Test suite for message validation"""
    
    def test_create_message_empty_content_no_files(self):
        """Test creating message with no content and no files"""
        response = client.post(
            "/api/v1/messages/",
            json={
                "room_id": "room-456"
                # No content, no files
            }
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_create_message_content_too_long(self):
        """Test creating message with content too long"""
        long_content = "a" * 4001  # Over 4000 char limit
        
        response = client.post(
            "/api/v1/messages/",
            json={
                "content": long_content,
                "room_id": "room-456"
            }
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_create_message_both_room_and_conversation(self):
        """Test creating message with both room_id and conversation_id"""
        response = client.post(
            "/api/v1/messages/",
            json={
                "content": "Hello",
                "room_id": "room-456",
                "conversation_id": "conv-789"
            }
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_create_message_neither_room_nor_conversation(self):
        """Test creating message with neither room_id nor conversation_id"""
        response = client.post(
            "/api/v1/messages/",
            json={
                "content": "Hello"
                # No room_id or conversation_id
            }
        )
        
        assert response.status_code == 422  # Validation error

class TestConversationsAPI:
    """Test suite for DM conversations API"""
    
    @patch('app.auth.dependencies.get_current_user')
    def test_create_conversation_success(self, mock_get_current_user):
        """Test creating/getting DM conversation successfully"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock target user exists
            mock_target_user = MagicMock()
            mock_target_user.id = "user-456"
            mock_target_user.username = "targetuser"
            mock_target_user.picture_url = None
            mock_target_user.user_type = "human"
            
            mock_db.query().filter.return_value.first.side_effect = [
                mock_target_user,  # Target user exists
                None  # No existing conversation
            ]
            
            # Mock friendship service
            with patch('app.services.friendship_service.FriendshipService') as mock_fs_class:
                mock_fs = mock_fs_class.return_value
                mock_fs.can_send_dm.return_value = (True, "Users are friends")
                
                # Mock conversation creation
                mock_conversation = MagicMock()
                mock_conversation.id = "conv-789"
                mock_conversation.created_at.isoformat.return_value = "2023-01-01T00:00:00"
                
                mock_get_db.return_value = mock_db
                
                response = client.post(
                    "/api/v1/messages/conversations",
                    json={"user_id": "user-456"}
                )
                
                assert response.status_code == 200
                data = response.json()
                assert data["other_user"]["username"] == "targetuser"
    
    @patch('app.auth.dependencies.get_current_user')
    def test_create_conversation_cannot_dm(self, mock_get_current_user):
        """Test creating conversation when users cannot DM"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock target user exists
            mock_target_user = MagicMock()
            mock_target_user.id = "user-456"
            
            mock_db.query().filter.return_value.first.return_value = mock_target_user
            
            # Mock friendship service - cannot DM
            with patch('app.services.friendship_service.FriendshipService') as mock_fs_class:
                mock_fs = mock_fs_class.return_value
                mock_fs.can_send_dm.return_value = (False, "Users are not friends")
                
                mock_get_db.return_value = mock_db
                
                response = client.post(
                    "/api/v1/messages/conversations",
                    json={"user_id": "user-456"}
                )
                
                assert response.status_code == 403
                data = response.json()
                assert "Cannot send DM" in data["detail"]
    
    @patch('app.auth.dependencies.get_current_user')
    def test_create_conversation_self(self, mock_get_current_user):
        """Test creating conversation with self"""
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_get_current_user.return_value = mock_user
        
        with patch('app.db.database.get_db') as mock_get_db:
            mock_db = MagicMock()
            
            # Mock target user is same as current user
            mock_target_user = MagicMock()
            mock_target_user.id = "user-123"  # Same as current user
            
            mock_db.query().filter.return_value.first.return_value = mock_target_user
            mock_get_db.return_value = mock_db
            
            response = client.post(
                "/api/v1/messages/conversations",
                json={"user_id": "user-123"}
            )
            
            assert response.status_code == 400
            data = response.json()
            assert "Cannot create conversation with yourself" in data["detail"]

# Run tests with: pytest tests/test_messages.py -v