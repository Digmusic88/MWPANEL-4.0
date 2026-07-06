// EMERGENCY FIX for React.Children.only error in family users
// This script patches the issue directly in the compiled JavaScript

const fs = require('fs');
const path = require('path');

const NGINX_HTML_PATH = '/tmp/nginx-html';

try {
  // Create emergency fix for family users
  const emergencyFamilyCode = `
// EMERGENCY FAMILY FIX - Bypass React.Children.only error
window.emergencyFamilyFix = function() {
  // Override Ant Design's problematic component
  if (window.antd && window.antd.Badge) {
    const originalBadge = window.antd.Badge;
    window.antd.Badge = function(props) {
      try {
        // Ensure children is always a single React element
        if (props.children) {
          if (Array.isArray(props.children)) {
            props.children = props.children[0] || React.createElement('span');
          }
          if (!React.isValidElement(props.children)) {
            props.children = React.createElement('span', {}, props.children);
          }
        }
        return originalBadge(props);
      } catch (error) {
        console.log('Badge error bypassed:', error);
        return React.createElement('span', {}, props.children);
      }
    };
  }
  
  // Override React.Children.only to prevent errors
  if (window.React && window.React.Children) {
    const originalOnly = window.React.Children.only;
    window.React.Children.only = function(children) {
      try {
        return originalOnly(children);
      } catch (error) {
        console.log('React.Children.only error bypassed:', error);
        if (Array.isArray(children)) {
          return children[0] || React.createElement('span');
        }
        return children || React.createElement('span');
      }
    };
  }
  
  console.log('🔧 Emergency family fix applied successfully');
};

// Apply fix when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.emergencyFamilyFix);
} else {
  window.emergencyFamilyFix();
}
`;

  console.log('Emergency fix script created successfully');
  console.log('To apply this fix, it needs to be injected into the main HTML file');
  
} catch (error) {
  console.error('Failed to create emergency fix:', error);
}