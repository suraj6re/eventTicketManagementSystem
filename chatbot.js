/**
 * EventMate AI - Professional Event Chatbot
 * Floating chat widget with natural language processing
 */

class EventMateAI {
    constructor() {
        this.isOpen = false;
        this.conversationHistory = [];
        this.context = {};
        this.init();
    }

    init() {
        this.createChatWidget();
        this.attachEventListeners();
        this.showGreeting();
    }

    createChatWidget() {
        // Create chat widget HTML
        const chatHTML = `
            <div id="eventmate-chat-widget" class="eventmate-widget">
                <!-- Chat Toggle Button -->
                <div id="eventmate-toggle" class="eventmate-toggle">
                    <div class="eventmate-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12C2 13.54 2.38 14.99 3.06 16.26L2 22L7.74 20.94C9.01 21.62 10.46 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C10.74 20 9.54 19.68 8.5 19.1L8.19 18.93L4.91 19.8L5.78 16.52L5.61 16.21C5.02 15.17 4.7 13.97 4.7 12.7C4.7 7.58 8.88 3.4 14 3.4C19.12 3.4 23.3 7.58 23.3 12.7C23.3 17.82 19.12 22 14 22H12Z" fill="currentColor"/>
                        </svg>
                    </div>
                    <div class="eventmate-close-icon" style="display: none;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                        </svg>
                    </div>
                </div>

                <!-- Chat Window -->
                <div id="eventmate-chat-window" class="eventmate-chat-window">
                    <!-- Header -->
                    <div class="eventmate-header">
                        <div class="eventmate-avatar">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 21H5V3H13V9H19Z" fill="currentColor"/>
                            </svg>
                        </div>
                        <div class="eventmate-info">
                            <h4>EventMate AI</h4>
                            <span>Your Personal Event Concierge</span>
                        </div>
                    </div>

                    <!-- Messages Container -->
                    <div id="eventmate-messages" class="eventmate-messages">
                        <!-- Messages will be added here -->
                    </div>

                    <!-- Quick Actions -->
                    <div id="eventmate-quick-actions" class="eventmate-quick-actions">
                        <button class="eventmate-quick-btn" data-action="featured">Show Featured Events</button>
                        <button class="eventmate-quick-btn" data-action="mood">Recommended for My Mood</button>
                        <button class="eventmate-quick-btn" data-action="nearby">Find Shows Near Me</button>
                    </div>

                    <!-- Input Area -->
                    <div class="eventmate-input-area">
                        <input type="text" id="eventmate-input" placeholder="Ask me about events, movies, shows..." maxlength="200">
                        <button id="eventmate-send" class="eventmate-send-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="currentColor"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add to page
        document.body.insertAdjacentHTML('beforeend', chatHTML);
    }

    attachEventListeners() {
        const toggle = document.getElementById('eventmate-toggle');
        const sendBtn = document.getElementById('eventmate-send');
        const input = document.getElementById('eventmate-input');
        const quickActions = document.getElementById('eventmate-quick-actions');

        // Toggle chat window
        toggle.addEventListener('click', () => this.toggleChat());

        // Send message
        sendBtn.addEventListener('click', () => this.sendMessage());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Quick actions
        quickActions.addEventListener('click', (e) => {
            if (e.target.classList.contains('eventmate-quick-btn')) {
                const action = e.target.dataset.action;
                this.handleQuickAction(action);
            }
        });
    }

    toggleChat() {
        const widget = document.getElementById('eventmate-chat-widget');
        const chatWindow = document.getElementById('eventmate-chat-window');
        const icon = document.querySelector('.eventmate-icon');
        const closeIcon = document.querySelector('.eventmate-close-icon');

        this.isOpen = !this.isOpen;

        if (this.isOpen) {
            widget.classList.add('open');
            chatWindow.style.display = 'flex';
            icon.style.display = 'none';
            closeIcon.style.display = 'block';
            
            // Focus input
            setTimeout(() => {
                document.getElementById('eventmate-input').focus();
            }, 300);
        } else {
            widget.classList.remove('open');
            setTimeout(() => {
                chatWindow.style.display = 'none';
            }, 300);
            icon.style.display = 'block';
            closeIcon.style.display = 'none';
        }
    }

    showGreeting() {
        setTimeout(() => {
            this.addMessage('bot', "Hi! 👋 I'm EventMate AI — your event guide. What kind of show are you in the mood for today?");
        }, 1000);
    }

    async sendMessage() {
        const input = document.getElementById('eventmate-input');
        const message = input.value.trim();

        if (!message) return;

        // Add user message
        this.addMessage('user', message);
        input.value = '';

        // Show typing indicator
        this.showTyping();

        try {
            // Send to chatbot API
            const response = await fetch('/chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    context: this.context
                })
            });

            const data = await response.json();
            
            // Hide typing indicator
            this.hideTyping();

            // Add bot response
            this.addMessage('bot', data.response);

            // Show events if any
            if (data.events && data.events.length > 0) {
                this.showEvents(data.events);
            }

            // Update context
            this.context = data.context || {};

            // Update conversation history
            this.conversationHistory.push({
                user: message,
                bot: data.response,
                events: data.events || []
            });

        } catch (error) {
            console.error('Chatbot error:', error);
            this.hideTyping();
            this.addMessage('bot', "Sorry, I'm having trouble right now. Please try again in a moment! 😅");
        }
    }

    handleQuickAction(action) {
        const actionMessages = {
            'featured': 'Show me featured events',
            'mood': 'Recommend events for my mood',
            'nearby': 'Find shows near me'
        };

        const message = actionMessages[action];
        if (message) {
            document.getElementById('eventmate-input').value = message;
            this.sendMessage();
        }
    }

    addMessage(sender, text) {
        const messagesContainer = document.getElementById('eventmate-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `eventmate-message ${sender}`;

        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${text}</p>
                <span class="message-time">${time}</span>
            </div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showEvents(events) {
        const messagesContainer = document.getElementById('eventmate-messages');
        const eventsDiv = document.createElement('div');
        eventsDiv.className = 'eventmate-events';

        let eventsHTML = '<div class="events-container">';
        
        events.forEach(event => {
            eventsHTML += `
                <div class="event-card" data-event-id="${event.id}">
                    <div class="event-image">
                        <img src="${event.image_url}" alt="${event.name}" onerror="this.src='/static/images/placeholder.svg'">
                    </div>
                    <div class="event-details">
                        <h5>${event.name}</h5>
                        <p class="event-category">${event.category} • ${event.mood}</p>
                        <p class="event-venue">${event.venue}</p>
                        <p class="event-datetime">${event.date} • ${event.time}</p>
                        <p class="event-price">${event.price}</p>
                        <div class="event-actions">
                            <button class="btn-book" onclick="eventMateAI.bookEvent(${event.id})">🎟 Book Now</button>
                            <button class="btn-info" onclick="eventMateAI.showEventInfo(${event.id})">📖 More Info</button>
                        </div>
                    </div>
                </div>
            `;
        });

        eventsHTML += '</div>';
        eventsDiv.innerHTML = eventsHTML;

        messagesContainer.appendChild(eventsDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showTyping() {
        const messagesContainer = document.getElementById('eventmate-messages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'eventmate-message bot typing';
        typingDiv.id = 'typing-indicator';

        typingDiv.innerHTML = `
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTyping() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    bookEvent(eventId) {
        // Redirect to booking or show booking modal
        window.location.href = `/event/${eventId}`;
    }

    showEventInfo(eventId) {
        // Show more details about the event
        this.addMessage('user', `Tell me more about event ${eventId}`);
        this.sendMessage();
    }
}

// Initialize EventMate AI when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.eventMateAI = new EventMateAI();
});