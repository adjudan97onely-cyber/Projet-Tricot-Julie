#!/usr/bin/env python3
"""
Backend API Tests for Julie Créations
Tests all backend endpoints with realistic French knitting/crochet data
"""
import requests
import json
import base64
import os
from datetime import datetime
from typing import Dict, Any
import sys

# Get backend URL from environment
BACKEND_URL = "https://knit-studio-1.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class JulieCreationsAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.test_results = []
        self.created_ids = {
            'conversations': [],
            'projects': [],
            'gallery': [],
            'messages': [],
            'comments': []
        }

    def log_result(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            'test': test_name,
            'status': status,
            'details': details,
            'response': response_data
        }
        self.test_results.append(result)
        print(f"{status} {test_name}")
        if details:
            print(f"   {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def create_sample_image_base64(self) -> str:
        """Create a small sample image in base64"""
        # Simple 1x1 PNG in base64
        return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

    def test_health_check(self):
        """Test API health endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/health")
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'healthy':
                    self.log_result("API Health Check", True, f"Service: {data.get('service', 'Unknown')}")
                else:
                    self.log_result("API Health Check", False, f"Unexpected status: {data}")
            else:
                self.log_result("API Health Check", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("API Health Check", False, f"Exception: {str(e)}")

    def test_chat_api_with_ai(self):
        """Test chat API with AI - HIGH PRIORITY"""
        try:
            # Test text-only chat
            chat_data = {
                "message": "Quel type de laine conseillez-vous pour tricoter un bonnet chaud pour l'hiver?",
            }
            
            response = self.session.post(f"{API_BASE}/chat", json=chat_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'response' in data and 'conversation_id' in data:
                    # Check if response is in French and contains knitting advice
                    ai_response = data['response'].lower()
                    french_indicators = ['laine', 'tricot', 'bonnet', 'aiguilles', 'maille']
                    has_french_content = any(indicator in ai_response for indicator in french_indicators)
                    
                    if has_french_content:
                        self.created_ids['conversations'].append(data['conversation_id'])
                        self.log_result("Chat API - Text Message", True, 
                                      f"AI responded in French with knitting advice. Conversation ID: {data['conversation_id']}")
                    else:
                        self.log_result("Chat API - Text Message", False, 
                                      f"AI response doesn't seem to contain French knitting advice: {data['response'][:100]}...")
                else:
                    self.log_result("Chat API - Text Message", False, f"Missing required fields in response", data)
            else:
                self.log_result("Chat API - Text Message", False, f"HTTP {response.status_code}", response.text)

            # Test chat with image
            image_base64 = self.create_sample_image_base64()
            chat_with_image = {
                "message": "Pouvez-vous analyser ce projet de tricot et me donner des conseils?",
                "image_base64": f"data:image/png;base64,{image_base64}"
            }
            
            response = self.session.post(f"{API_BASE}/chat", json=chat_with_image)
            
            if response.status_code == 200:
                data = response.json()
                if 'response' in data:
                    if data.get('conversation_id'):
                        self.created_ids['conversations'].append(data['conversation_id'])
                    self.log_result("Chat API - With Image", True, "AI processed image and responded")
                else:
                    self.log_result("Chat API - With Image", False, "Missing response in data", data)
            else:
                self.log_result("Chat API - With Image", False, f"HTTP {response.status_code}", response.text)

        except Exception as e:
            self.log_result("Chat API", False, f"Exception: {str(e)}")

    def test_conversations_crud(self):
        """Test conversations CRUD operations"""
        try:
            # Test GET conversations
            response = self.session.get(f"{API_BASE}/conversations")
            if response.status_code == 200:
                conversations = response.json()
                self.log_result("Get Conversations", True, f"Retrieved {len(conversations)} conversations")
                
                # Test getting messages for a conversation if we have one
                if conversations and len(conversations) > 0:
                    conv_id = conversations[0]['id']
                    msg_response = self.session.get(f"{API_BASE}/conversations/{conv_id}/messages")
                    if msg_response.status_code == 200:
                        messages = msg_response.json()
                        self.log_result("Get Conversation Messages", True, f"Retrieved {len(messages)} messages")
                    else:
                        self.log_result("Get Conversation Messages", False, f"HTTP {msg_response.status_code}")
            else:
                self.log_result("Get Conversations", False, f"HTTP {response.status_code}", response.text)

            # Test DELETE conversation if we have created ones
            if self.created_ids['conversations']:
                conv_id = self.created_ids['conversations'][0]
                response = self.session.delete(f"{API_BASE}/conversations/{conv_id}")
                if response.status_code == 200:
                    self.log_result("Delete Conversation", True, "Conversation deleted successfully")
                else:
                    self.log_result("Delete Conversation", False, f"HTTP {response.status_code}", response.text)

        except Exception as e:
            self.log_result("Conversations CRUD", False, f"Exception: {str(e)}")

    def test_projects_crud(self):
        """Test projects CRUD operations - HIGH PRIORITY"""
        try:
            # Test CREATE project
            project_data = {
                "name": "Bonnet en laine mérinos",
                "description": "Un bonnet chaud pour l'hiver, avec un motif de torsades",
                "project_type": "bonnet",
                "yarn_type": "Laine mérinos 100%",
                "needle_size": "4.5mm",
                "image_base64": f"data:image/png;base64,{self.create_sample_image_base64()}",
                "notes": "Utiliser la technique des torsades pour le motif principal"
            }
            
            response = self.session.post(f"{API_BASE}/projects", json=project_data)
            
            if response.status_code == 200:
                project = response.json()
                if 'id' in project:
                    project_id = project['id']
                    self.created_ids['projects'].append(project_id)
                    self.log_result("Create Project", True, f"Project created with ID: {project_id}")
                    
                    # Test GET specific project
                    get_response = self.session.get(f"{API_BASE}/projects/{project_id}")
                    if get_response.status_code == 200:
                        self.log_result("Get Specific Project", True, "Project retrieved successfully")
                    else:
                        self.log_result("Get Specific Project", False, f"HTTP {get_response.status_code}")
                    
                    # Test UPDATE project
                    update_data = {
                        "name": "Bonnet en laine mérinos - Version améliorée",
                        "description": "Un bonnet chaud pour l'hiver, avec un motif de torsades complexe",
                        "project_type": "bonnet",
                        "yarn_type": "Laine mérinos 100% - Extra Fine",
                        "needle_size": "4.5mm"
                    }
                    
                    put_response = self.session.put(f"{API_BASE}/projects/{project_id}", json=update_data)
                    if put_response.status_code == 200:
                        updated_project = put_response.json()
                        if updated_project['name'] == update_data['name']:
                            self.log_result("Update Project", True, "Project updated successfully")
                        else:
                            self.log_result("Update Project", False, "Project not updated correctly")
                    else:
                        self.log_result("Update Project", False, f"HTTP {put_response.status_code}")
                        
                else:
                    self.log_result("Create Project", False, "No ID in response", project)
            else:
                self.log_result("Create Project", False, f"HTTP {response.status_code}", response.text)

            # Test GET all projects
            response = self.session.get(f"{API_BASE}/projects")
            if response.status_code == 200:
                projects = response.json()
                self.log_result("Get All Projects", True, f"Retrieved {len(projects)} projects")
            else:
                self.log_result("Get All Projects", False, f"HTTP {response.status_code}", response.text)

            # Test DELETE project (we'll keep one for comments testing)
            if len(self.created_ids['projects']) > 1:
                project_id = self.created_ids['projects'][-1]
                response = self.session.delete(f"{API_BASE}/projects/{project_id}")
                if response.status_code == 200:
                    self.log_result("Delete Project", True, "Project deleted successfully")
                    self.created_ids['projects'].remove(project_id)
                else:
                    self.log_result("Delete Project", False, f"HTTP {response.status_code}", response.text)

        except Exception as e:
            self.log_result("Projects CRUD", False, f"Exception: {str(e)}")

    def test_gallery_crud(self):
        """Test gallery CRUD operations - HIGH PRIORITY"""
        try:
            # Test CREATE gallery item
            gallery_data = {
                "title": "Écharpe en alpaca",
                "description": "Belle écharpe douce en laine d'alpaca, parfaite pour les soirées fraîches",
                "category": "écharpe",
                "image_base64": f"data:image/png;base64,{self.create_sample_image_base64()}",
                "price": "85€",
                "available": True,
                "featured": False
            }
            
            response = self.session.post(f"{API_BASE}/gallery", json=gallery_data)
            
            if response.status_code == 200:
                item = response.json()
                if 'id' in item:
                    item_id = item['id']
                    self.created_ids['gallery'].append(item_id)
                    self.log_result("Create Gallery Item", True, f"Gallery item created with ID: {item_id}")
                    
                    # Test GET specific gallery item
                    get_response = self.session.get(f"{API_BASE}/gallery/{item_id}")
                    if get_response.status_code == 200:
                        self.log_result("Get Specific Gallery Item", True, "Gallery item retrieved successfully")
                    else:
                        self.log_result("Get Specific Gallery Item", False, f"HTTP {get_response.status_code}")
                    
                    # Test UPDATE gallery item
                    update_data = {
                        "title": "Écharpe en alpaca - Collection Premium",
                        "description": "Belle écharpe douce en laine d'alpaca, parfaite pour les soirées fraîches",
                        "category": "écharpe",
                        "price": "95€",
                        "available": True,
                        "featured": True
                    }
                    
                    put_response = self.session.put(f"{API_BASE}/gallery/{item_id}", json=update_data)
                    if put_response.status_code == 200:
                        updated_item = put_response.json()
                        if updated_item['featured'] == True:
                            self.log_result("Update Gallery Item", True, "Gallery item updated successfully")
                        else:
                            self.log_result("Update Gallery Item", False, "Gallery item not updated correctly")
                    else:
                        self.log_result("Update Gallery Item", False, f"HTTP {put_response.status_code}")
                        
                else:
                    self.log_result("Create Gallery Item", False, "No ID in response", item)
            else:
                self.log_result("Create Gallery Item", False, f"HTTP {response.status_code}", response.text)

            # Create another item for category testing
            bonnet_data = {
                "title": "Bonnet en laine mérinos",
                "description": "Bonnet chaud et confortable",
                "category": "bonnet",
                "price": "45€",
                "available": True,
                "featured": False
            }
            
            bonnet_response = self.session.post(f"{API_BASE}/gallery", json=bonnet_data)
            if bonnet_response.status_code == 200:
                bonnet_item = bonnet_response.json()
                self.created_ids['gallery'].append(bonnet_item['id'])

            # Test GET all gallery items
            response = self.session.get(f"{API_BASE}/gallery")
            if response.status_code == 200:
                items = response.json()
                self.log_result("Get All Gallery Items", True, f"Retrieved {len(items)} gallery items")
            else:
                self.log_result("Get All Gallery Items", False, f"HTTP {response.status_code}", response.text)

            # Test GET gallery by category
            response = self.session.get(f"{API_BASE}/gallery?category=bonnet")
            if response.status_code == 200:
                bonnet_items = response.json()
                self.log_result("Get Gallery by Category", True, f"Retrieved {len(bonnet_items)} bonnet items")
            else:
                self.log_result("Get Gallery by Category", False, f"HTTP {response.status_code}", response.text)

            # Test GET featured items
            response = self.session.get(f"{API_BASE}/gallery?featured_only=true")
            if response.status_code == 200:
                featured_items = response.json()
                self.log_result("Get Featured Gallery Items", True, f"Retrieved {len(featured_items)} featured items")
            else:
                self.log_result("Get Featured Gallery Items", False, f"HTTP {response.status_code}", response.text)

            # Test DELETE gallery item
            if self.created_ids['gallery']:
                item_id = self.created_ids['gallery'][-1]
                response = self.session.delete(f"{API_BASE}/gallery/{item_id}")
                if response.status_code == 200:
                    self.log_result("Delete Gallery Item", True, "Gallery item deleted successfully")
                    self.created_ids['gallery'].remove(item_id)
                else:
                    self.log_result("Delete Gallery Item", False, f"HTTP {response.status_code}", response.text)

        except Exception as e:
            self.log_result("Gallery CRUD", False, f"Exception: {str(e)}")

    def test_client_messages_system(self):
        """Test client messages system - HIGH PRIORITY"""
        try:
            # Test CREATE client message
            message_data = {
                "client_name": "Marie Dubois",
                "client_email": "marie.dubois@email.fr",
                "client_phone": "06 12 34 56 78",
                "subject": "Commande personnalisée - Bonnet",
                "message": "Bonjour Julie, je souhaiterais commander un bonnet personnalisé pour ma fille. Pourriez-vous me contacter pour discuter des détails? Merci beaucoup!"
            }
            
            response = self.session.post(f"{API_BASE}/messages", json=message_data)
            
            if response.status_code == 200:
                message = response.json()
                if 'id' in message:
                    message_id = message['id']
                    self.created_ids['messages'].append(message_id)
                    self.log_result("Create Client Message", True, f"Message created with ID: {message_id}")
                    
                    # Test GET specific message
                    get_response = self.session.get(f"{API_BASE}/messages/{message_id}")
                    if get_response.status_code == 200:
                        retrieved_msg = get_response.json()
                        if retrieved_msg['status'] == 'nouveau':
                            self.log_result("Get Specific Message", True, f"Message status: {retrieved_msg['status']}")
                        else:
                            self.log_result("Get Specific Message", False, f"Unexpected status: {retrieved_msg['status']}")
                    else:
                        self.log_result("Get Specific Message", False, f"HTTP {get_response.status_code}")
                    
                    # Test mark message as read
                    read_response = self.session.put(f"{API_BASE}/messages/{message_id}/read")
                    if read_response.status_code == 200:
                        self.log_result("Mark Message as Read", True, "Message marked as read")
                    else:
                        self.log_result("Mark Message as Read", False, f"HTTP {read_response.status_code}")
                    
                    # Test reply to message
                    reply_data = {
                        "reply": "Bonjour Marie, merci pour votre message! Je serais ravie de réaliser un bonnet personnalisé pour votre fille. Je vous contacte dans la journée pour discuter des détails. À bientôt!"
                    }
                    
                    reply_response = self.session.put(f"{API_BASE}/messages/{message_id}/reply", json=reply_data)
                    if reply_response.status_code == 200:
                        replied_msg = reply_response.json()
                        if replied_msg['status'] == 'répondu' and replied_msg['reply'] == reply_data['reply']:
                            self.log_result("Reply to Message", True, "Message replied successfully")
                        else:
                            self.log_result("Reply to Message", False, "Reply not saved correctly")
                    else:
                        self.log_result("Reply to Message", False, f"HTTP {reply_response.status_code}")
                        
                else:
                    self.log_result("Create Client Message", False, "No ID in response", message)
            else:
                self.log_result("Create Client Message", False, f"HTTP {response.status_code}", response.text)

            # Test GET all messages
            response = self.session.get(f"{API_BASE}/messages")
            if response.status_code == 200:
                messages = response.json()
                self.log_result("Get All Messages", True, f"Retrieved {len(messages)} messages")
            else:
                self.log_result("Get All Messages", False, f"HTTP {response.status_code}", response.text)

            # Test GET unread count
            response = self.session.get(f"{API_BASE}/messages/count")
            if response.status_code == 200:
                count_data = response.json()
                if 'unread_count' in count_data:
                    self.log_result("Get Unread Count", True, f"Unread messages: {count_data['unread_count']}")
                else:
                    self.log_result("Get Unread Count", False, "Missing unread_count field", count_data)
            else:
                self.log_result("Get Unread Count", False, f"HTTP {response.status_code}", response.text)

            # Test GET messages by status
            response = self.session.get(f"{API_BASE}/messages?status=répondu")
            if response.status_code == 200:
                replied_messages = response.json()
                self.log_result("Get Messages by Status", True, f"Retrieved {len(replied_messages)} replied messages")
            else:
                self.log_result("Get Messages by Status", False, f"HTTP {response.status_code}", response.text)

            # Test DELETE message
            if self.created_ids['messages']:
                message_id = self.created_ids['messages'][-1]
                response = self.session.delete(f"{API_BASE}/messages/{message_id}")
                if response.status_code == 200:
                    self.log_result("Delete Message", True, "Message deleted successfully")
                    self.created_ids['messages'].remove(message_id)
                else:
                    self.log_result("Delete Message", False, f"HTTP {response.status_code}", response.text)

        except Exception as e:
            self.log_result("Client Messages System", False, f"Exception: {str(e)}")

    def test_comments_on_projects(self):
        """Test comments on projects system"""
        try:
            # First ensure we have a project to comment on
            if not self.created_ids['projects']:
                # Create a project for testing comments
                project_data = {
                    "name": "Pull irlandais",
                    "description": "Pull traditionnel avec motifs celtiques",
                    "project_type": "pull"
                }
                
                response = self.session.post(f"{API_BASE}/projects", json=project_data)
                if response.status_code == 200:
                    project = response.json()
                    self.created_ids['projects'].append(project['id'])
                    
            if self.created_ids['projects']:
                project_id = self.created_ids['projects'][0]
                
                # Test CREATE comment
                comment_data = {
                    "project_id": project_id,
                    "author_name": "Sophie Martin",
                    "content": "Magnifique projet! Pourriez-vous partager le patron que vous avez utilisé? J'aimerais beaucoup essayer de le reproduire."
                }
                
                response = self.session.post(f"{API_BASE}/comments", json=comment_data)
                
                if response.status_code == 200:
                    comment = response.json()
                    if 'id' in comment:
                        comment_id = comment['id']
                        self.created_ids['comments'].append(comment_id)
                        self.log_result("Create Project Comment", True, f"Comment created with ID: {comment_id}")
                        
                        # Test GET project comments
                        get_response = self.session.get(f"{API_BASE}/projects/{project_id}/comments")
                        if get_response.status_code == 200:
                            comments = get_response.json()
                            self.log_result("Get Project Comments", True, f"Retrieved {len(comments)} comments for project")
                        else:
                            self.log_result("Get Project Comments", False, f"HTTP {get_response.status_code}")
                        
                        # Test reply to comment
                        reply_data = {
                            "reply": "Merci Sophie! Je suis ravie que le projet vous plaise. Je vais préparer un tutoriel détaillé avec le patron la semaine prochaine."
                        }
                        
                        reply_response = self.session.put(f"{API_BASE}/comments/{comment_id}/reply", json=reply_data)
                        if reply_response.status_code == 200:
                            replied_comment = reply_response.json()
                            if replied_comment['reply'] == reply_data['reply']:
                                self.log_result("Reply to Comment", True, "Comment reply saved successfully")
                            else:
                                self.log_result("Reply to Comment", False, "Reply not saved correctly")
                        else:
                            self.log_result("Reply to Comment", False, f"HTTP {reply_response.status_code}")
                        
                        # Test DELETE comment
                        delete_response = self.session.delete(f"{API_BASE}/comments/{comment_id}")
                        if delete_response.status_code == 200:
                            self.log_result("Delete Comment", True, "Comment deleted successfully")
                            self.created_ids['comments'].remove(comment_id)
                        else:
                            self.log_result("Delete Comment", False, f"HTTP {delete_response.status_code}")
                            
                    else:
                        self.log_result("Create Project Comment", False, "No ID in response", comment)
                else:
                    self.log_result("Create Project Comment", False, f"HTTP {response.status_code}", response.text)
            else:
                self.log_result("Comments on Projects", False, "No project available for testing comments")

        except Exception as e:
            self.log_result("Comments on Projects", False, f"Exception: {str(e)}")

    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n" + "="*60)
        print("CLEANING UP TEST DATA")
        print("="*60)
        
        # Clean up projects (this will also clean up related comments)
        for project_id in self.created_ids['projects']:
            try:
                response = self.session.delete(f"{API_BASE}/projects/{project_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted project {project_id}")
                else:
                    print(f"❌ Failed to delete project {project_id}: HTTP {response.status_code}")
            except Exception as e:
                print(f"❌ Error deleting project {project_id}: {e}")
        
        # Clean up gallery items
        for item_id in self.created_ids['gallery']:
            try:
                response = self.session.delete(f"{API_BASE}/gallery/{item_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted gallery item {item_id}")
                else:
                    print(f"❌ Failed to delete gallery item {item_id}: HTTP {response.status_code}")
            except Exception as e:
                print(f"❌ Error deleting gallery item {item_id}: {e}")
        
        # Clean up messages
        for message_id in self.created_ids['messages']:
            try:
                response = self.session.delete(f"{API_BASE}/messages/{message_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted message {message_id}")
                else:
                    print(f"❌ Failed to delete message {message_id}: HTTP {response.status_code}")
            except Exception in e:
                print(f"❌ Error deleting message {message_id}: {e}")
        
        # Clean up conversations
        for conv_id in self.created_ids['conversations']:
            try:
                response = self.session.delete(f"{API_BASE}/conversations/{conv_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted conversation {conv_id}")
                else:
                    print(f"❌ Failed to delete conversation {conv_id}: HTTP {response.status_code}")
            except Exception as e:
                print(f"❌ Error deleting conversation {conv_id}: {e}")

    def run_all_tests(self):
        """Run all backend API tests"""
        print("="*60)
        print("JULIE CRÉATIONS BACKEND API TESTS")
        print("="*60)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"API Base: {API_BASE}")
        print("="*60)
        print()
        
        # Run tests in order
        self.test_health_check()
        self.test_chat_api_with_ai()  # HIGH PRIORITY
        self.test_conversations_crud()
        self.test_projects_crud()  # HIGH PRIORITY
        self.test_gallery_crud()  # HIGH PRIORITY
        self.test_client_messages_system()  # HIGH PRIORITY
        self.test_comments_on_projects()
        
        # Summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for result in self.test_results if "✅ PASS" in result['status'])
        failed = sum(1 for result in self.test_results if "❌ FAIL" in result['status'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        
        if failed > 0:
            print("\nFAILED TESTS:")
            for result in self.test_results:
                if "❌ FAIL" in result['status']:
                    print(f"  ❌ {result['test']}: {result['details']}")
        
        print(f"\nSuccess Rate: {(passed/total*100):.1f}%")
        
        # Clean up
        self.cleanup_test_data()
        
        return passed, failed, total

if __name__ == "__main__":
    tester = JulieCreationsAPITester()
    passed, failed, total = tester.run_all_tests()
    
    # Exit with error code if tests failed
    if failed > 0:
        sys.exit(1)
    else:
        print("\n🎉 All tests passed!")
        sys.exit(0)