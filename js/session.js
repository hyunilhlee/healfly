export const sessionManager = {
    init() {
        this.sessionId = localStorage.getItem('sessionId') || this.generateSessionId();
        localStorage.setItem('sessionId', this.sessionId);
    },
    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}; 