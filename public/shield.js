/**
 * Human Verification Shield - Drop-in Security Widget
 * A math-driven human verification and bot protection platform
 */

(function(window, document) {
  'use strict';

  const VERSION = '1.0.0';
  const API_BASE = 'http://localhost:3000/api'; // Configure this in production

  /**
   * Main Shield class
   */
  class HumanShield {
    constructor(options = {}) {
      this.options = {
        apiKey: options.apiKey || '',
        theme: options.theme || 'light',
        language: options.language || 'en',
        invisible: options.invisible || false,
        onVerified: options.onVerified || null,
        onError: options.onError || null,
        ...options
      };

      this.challenge = null;
      this.behaviorTracker = new BehaviorTracker();
      this.startTime = null;
      this.element = null;
      this.isInitialized = false;
    }

    /**
     * Initialize the shield
     */
    init() {
      if (this.isInitialized) return;
      
      this.createWidget();
      this.bindEvents();
      this.isInitialized = true;
    }

    /**
     * Create the widget UI
     */
    createWidget() {
      // Create container
      this.element = document.createElement('div');
      this.element.id = 'human-shield-container';
      this.element.className = `human-shield ${this.options.theme}`;
      
      // Add CSS styles
      this.addStyles();
      
      // Create widget structure
      this.element.innerHTML = `
        <div class="shield-wrapper">
          <div class="shield-header">
            <div class="shield-logo">🛡️</div>
            <div class="shield-title">Human Verification</div>
          </div>
          <div class="shield-content">
            <div class="loading-indicator">
              <div class="spinner"></div>
              <p>Loading challenge...</p>
            </div>
            <div class="challenge-container" style="display: none;">
              <div class="challenge-question"></div>
              <div class="challenge-options"></div>
              <div class="challenge-input">
                <input type="text" placeholder="Enter your answer" />
                <button class="submit-btn">Verify</button>
              </div>
            </div>
            <div class="result-container" style="display: none;">
              <div class="result-icon"></div>
              <div class="result-message"></div>
            </div>
          </div>
          <div class="shield-footer">
            <div class="shield-info">
              <span class="shield-status">Initializing...</span>
            </div>
          </div>
        </div>
      `;

      // Add to page
      document.body.appendChild(this.element);
    }

    /**
     * Add CSS styles to the page
     */
    addStyles() {
      const style = document.createElement('style');
      style.textContent = `
        .human-shield {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 400px;
          width: 90%;
        }

        .human-shield.dark {
          background: #1a1a1a;
          color: white;
        }

        .shield-wrapper {
          padding: 24px;
        }

        .shield-header {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
        }

        .shield-logo {
          font-size: 24px;
          margin-right: 12px;
        }

        .shield-title {
          font-size: 18px;
          font-weight: 600;
        }

        .shield-content {
          margin-bottom: 20px;
        }

        .loading-indicator {
          text-align: center;
          padding: 40px 0;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .challenge-container {
          animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .challenge-question {
          font-size: 16px;
          margin-bottom: 16px;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #3498db;
        }

        .dark .challenge-question {
          background: #2a2a2a;
        }

        .challenge-options {
          margin-bottom: 16px;
        }

        .option-btn {
          display: block;
          width: 100%;
          padding: 12px;
          margin-bottom: 8px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .option-btn:hover {
          background: #f8f9fa;
          border-color: #3498db;
        }

        .dark .option-btn {
          background: #2a2a2a;
          border-color: #444;
          color: white;
        }

        .challenge-input {
          display: flex;
          gap: 8px;
        }

        .challenge-input input {
          flex: 1;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }

        .dark .challenge-input input {
          background: #2a2a2a;
          border-color: #444;
          color: white;
        }

        .submit-btn {
          padding: 12px 24px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .submit-btn:hover {
          background: #2980b9;
        }

        .submit-btn:disabled {
          background: #95a5a6;
          cursor: not-allowed;
        }

        .result-container {
          text-align: center;
          padding: 20px 0;
          animation: fadeIn 0.3s ease-in;
        }

        .result-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .result-message {
          font-size: 16px;
          margin-bottom: 8px;
        }

        .shield-footer {
          font-size: 12px;
          color: #666;
          text-align: center;
        }

        .dark .shield-footer {
          color: #999;
        }

        .shield-status {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          background: #f8f9fa;
        }

        .dark .shield-status {
          background: #2a2a2a;
        }

        /* Invisible mode styles */
        .human-shield.invisible {
          display: none;
        }
      `;
      
      document.head.appendChild(style);
    }

    /**
     * Bind events to UI elements
     */
    bindEvents() {
      const submitBtn = this.element.querySelector('.submit-btn');
      const input = this.element.querySelector('input');

      if (submitBtn) {
        submitBtn.addEventListener('click', () => this.submitAnswer());
      }

      if (input) {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.submitAnswer();
          }
        });
      }

      // Start behavior tracking
      this.behaviorTracker.start();
    }

    /**
     * Start the verification process
     */
    async start() {
      try {
        this.updateStatus('Generating challenge...');
        
        // Get risk factors
        const riskFactors = this.getRiskFactors();
        
        // Generate challenge
        const response = await fetch(`${API_BASE}/challenge/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.options.apiKey}`
          },
          body: JSON.stringify(riskFactors)
        });

        if (!response.ok) {
          throw new Error('Failed to generate challenge');
        }

        this.challenge = await response.json();
        this.startTime = Date.now();
        
        this.displayChallenge();
        this.updateStatus('Solve the challenge');
        
      } catch (error) {
        console.error('Shield error:', error);
        this.showError('Failed to load challenge');
        if (this.options.onError) {
          this.options.onError(error);
        }
      }
    }

    /**
     * Display the challenge to the user
     */
    displayChallenge() {
      const loadingIndicator = this.element.querySelector('.loading-indicator');
      const challengeContainer = this.element.querySelector('.challenge-container');
      const questionEl = this.element.querySelector('.challenge-question');
      const optionsEl = this.element.querySelector('.challenge-options');
      const inputContainer = this.element.querySelector('.challenge-input');

      // Hide loading, show challenge
      loadingIndicator.style.display = 'none';
      challengeContainer.style.display = 'block';

      // Display question
      questionEl.textContent = this.challenge.question;

      // Display options if available
      if (this.challenge.options && this.challenge.options.length > 0) {
        optionsEl.innerHTML = '';
        this.challenge.options.forEach(option => {
          const btn = document.createElement('button');
          btn.className = 'option-btn';
          btn.textContent = option;
          btn.addEventListener('click', () => {
            document.querySelector('input').value = option;
            this.submitAnswer();
          });
          optionsEl.appendChild(btn);
        });
        inputContainer.style.display = 'none';
      } else {
        optionsEl.style.display = 'none';
        inputContainer.style.display = 'flex';
      }
    }

    /**
     * Submit the user's answer
     */
    async submitAnswer() {
      const input = this.element.querySelector('input');
      const answer = input.value.trim();
      
      if (!answer) {
        this.showError('Please enter an answer');
        return;
      }

      try {
        this.updateStatus('Verifying...');
        this.disableSubmit(true);

        const timeTaken = Date.now() - this.startTime;
        const behaviorData = this.behaviorTracker.getData();

        const response = await fetch(`${API_BASE}/verification/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.options.apiKey}`
          },
          body: JSON.stringify({
            challengeId: this.challenge.id,
            answer: answer,
            timeTaken: timeTaken,
            behaviorData: behaviorData,
            riskFactors: this.getRiskFactors()
          })
        });

        if (!response.ok) {
          throw new Error('Verification failed');
        }

        const result = await response.json();
        this.displayResult(result);

        if (this.options.onVerified) {
          this.options.onVerified(result);
        }

      } catch (error) {
        console.error('Verification error:', error);
        this.showError('Verification failed');
        if (this.options.onError) {
          this.options.onError(error);
        }
      }
    }

    /**
     * Display verification result
     */
    displayResult(result) {
      const challengeContainer = this.element.querySelector('.challenge-container');
      const resultContainer = this.element.querySelector('.result-container');
      const iconEl = resultContainer.querySelector('.result-icon');
      const messageEl = resultContainer.querySelector('.result-message');

      challengeContainer.style.display = 'none';
      resultContainer.style.display = 'block';

      if (result.success) {
        iconEl.textContent = '✅';
        messageEl.textContent = 'Verification successful!';
        this.updateStatus('Verified');
      } else {
        iconEl.textContent = '❌';
        messageEl.textContent = 'Verification failed. Please try again.';
        this.updateStatus('Failed');
      }

      // Auto-close after 3 seconds on success
      if (result.success) {
        setTimeout(() => this.close(), 3000);
      }
    }

    /**
     * Show error message
     */
    showError(message) {
      const challengeContainer = this.element.querySelector('.challenge-container');
      const resultContainer = this.element.querySelector('.result-container');
      const iconEl = resultContainer.querySelector('.result-icon');
      const messageEl = resultContainer.querySelector('.result-message');

      challengeContainer.style.display = 'none';
      resultContainer.style.display = 'block';

      iconEl.textContent = '⚠️';
      messageEl.textContent = message;
      this.updateStatus('Error');
    }

    /**
     * Update status text
     */
    updateStatus(status) {
      const statusEl = this.element.querySelector('.shield-status');
      if (statusEl) {
        statusEl.textContent = status;
      }
    }

    /**
     * Enable/disable submit button
     */
    disableSubmit(disabled) {
      const submitBtn = this.element.querySelector('.submit-btn');
      if (submitBtn) {
        submitBtn.disabled = disabled;
      }
    }

    /**
     * Get risk factors from client
     */
    getRiskFactors() {
      return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screenResolution: `${screen.width}x${screen.height}`,
        colorDepth: screen.colorDepth,
        deviceMemory: navigator.deviceMemory || 0,
        hardwareConcurrency: navigator.hardwareConcurrency || 0,
        platform: navigator.platform,
      };
    }

    /**
     * Close the widget
     */
    close() {
      if (this.element) {
        this.element.remove();
      }
      this.behaviorTracker.stop();
    }

    /**
     * Reset the widget
     */
    reset() {
      this.challenge = null;
      this.startTime = null;
      this.behaviorTracker.reset();
      
      // Reset UI
      const loadingIndicator = this.element.querySelector('.loading-indicator');
      const challengeContainer = this.element.querySelector('.challenge-container');
      const resultContainer = this.element.querySelector('.result-container');
      
      loadingIndicator.style.display = 'block';
      challengeContainer.style.display = 'none';
      resultContainer.style.display = 'none';
      
      document.querySelector('input').value = '';
      this.updateStatus('Ready');
    }
  }

  /**
   * Behavior tracking class
   */
  class BehaviorTracker {
    constructor() {
      this.mouseMovements = [];
      this.clickTiming = [];
      this.typingPattern = null;
      this.focusEvents = [];
      this.startTime = null;
      this.isTracking = false;
      this.typingStartTime = null;
      this.keystrokes = [];
    }

    start() {
      if (this.isTracking) return;
      
      this.isTracking = true;
      this.startTime = Date.now();
      
      // Mouse movement tracking
      this.mouseMoveHandler = (e) => {
        this.mouseMovements.push({
          x: e.clientX,
          y: e.clientY,
          timestamp: Date.now(),
          duration: 0 // Will be calculated later
        });
      };
      
      document.addEventListener('mousemove', this.mouseMoveHandler);
      
      // Click timing tracking
      this.clickHandler = (e) => {
        const now = Date.now();
        const delay = this.clickTiming.length > 0 ? 
          now - this.clickTiming[this.clickTiming.length - 1].timestamp : 0;
        
        this.clickTiming.push({
          timestamp: now,
          target: e.target.tagName,
          delay: delay
        });
      };
      
      document.addEventListener('click', this.clickHandler);
      
      // Focus/blur tracking
      this.focusHandler = (e) => {
        this.focusEvents.push({
          type: 'focus',
          timestamp: Date.now(),
          element: e.target.tagName
        });
      };
      
      this.blurHandler = (e) => {
        this.focusEvents.push({
          type: 'blur',
          timestamp: Date.now(),
          element: e.target.tagName
        });
      };
      
      document.addEventListener('focus', this.focusHandler, true);
      document.addEventListener('blur', this.blurHandler, true);
    }

    stop() {
      if (!this.isTracking) return;
      
      this.isTracking = false;
      
      // Calculate mouse movement durations
      for (let i = 1; i < this.mouseMovements.length; i++) {
        this.mouseMovements[i].duration = 
          this.mouseMovements[i].timestamp - this.mouseMovements[i - 1].timestamp;
      }
      
      // Remove event listeners
      document.removeEventListener('mousemove', this.mouseMoveHandler);
      document.removeEventListener('click', this.clickHandler);
      document.removeEventListener('focus', this.focusHandler, true);
      document.removeEventListener('blur', this.blurHandler, true);
    }

    trackTyping(inputElement) {
      // Typing pattern tracking
      this.typingStartTime = Date.now();
      this.keystrokes = [];
      
      this.keydownHandler = (e) => {
        const now = Date.now();
        const delay = this.keystrokes.length > 0 ? 
          now - this.keystrokes[this.keystrokes.length - 1].timestamp : 0;
        
        this.keystrokes.push({
          key: e.key,
          timestamp: now,
          delay: delay
        });
      };
      
      inputElement.addEventListener('keydown', this.keydownHandler);
    }

    stopTypingTracking(inputElement) {
      if (this.keydownHandler) {
        inputElement.removeEventListener('keydown', this.keydownHandler);
        
        // Calculate typing pattern stats
        if (this.keystrokes.length > 0) {
          const totalTime = Date.now() - this.typingStartTime;
          const averageSpeed = totalTime / this.keystrokes.length;
          const corrections = this.keystrokes.filter(k => k.key === 'Backspace').length;
          
          this.typingPattern = {
            keystrokes: this.keystrokes,
            averageSpeed: averageSpeed,
            corrections: corrections
          };
        }
      }
    }

    getData() {
      return {
        mouseMovements: this.mouseMovements,
        clickTiming: this.clickTiming,
        typingPattern: this.typingPattern,
        focusEvents: this.focusEvents
      };
    }

    reset() {
      this.mouseMovements = [];
      this.clickTiming = [];
      this.typingPattern = null;
      this.focusEvents = [];
      this.keystrokes = [];
      this.typingStartTime = null;
    }
  }

  /**
   * Global API
   */
  window.HumanShield = HumanShield;

  // Auto-initialize if data attributes are present
  document.addEventListener('DOMContentLoaded', function() {
    const elements = document.querySelectorAll('[data-human-shield]');
    elements.forEach(element => {
      const shield = new HumanShield({
        apiKey: element.getAttribute('data-api-key'),
        theme: element.getAttribute('data-theme') || 'light',
        invisible: element.getAttribute('data-invisible') === 'true'
      });
      
      shield.init();
      
      // Bind click event
      element.addEventListener('click', () => {
        shield.start();
      });
    });
  });

})(window, document);
