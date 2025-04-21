import { Manifest } from 'stremio-addon-sdk';

function landingTemplate(manifest: Manifest): string {
  const configurationFields = manifest.config || [];
  const backgroundImageStyle = manifest.background
    ? `background-image: url(${manifest.background}); background-size: cover; background-position: center;`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${manifest.name || manifest.id}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    :root {
      --background: hsl(240 10% 3.9%);
      --foreground: hsl(0 0% 98%);
      --card: hsl(240 10% 5.9%);
      --card-foreground: hsl(0 0% 98%);
      --border: hsl(240 3.7% 15.9%);
      --input: hsl(240 3.7% 15.9%);
      --primary: hsl(217 91% 60%);
      --primary-foreground: hsl(0 0% 98%);
      --secondary: hsl(240 5.9% 10%);
      --secondary-foreground: hsl(0 0% 98%);
      --accent: hsl(240 3.7% 15.9%);
      --accent-foreground: hsl(0 0% 98%);
      --ring: hsl(217 91% 60%);
      --radius: 0.5rem;
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    body {
      font-family: var(--font-sans);
      background-color: var(--background);
      color: var(--foreground);
      line-height: 1.6;
      animation: fadeIn 0.3s ease-in-out;
    }
    
    .background-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      ${backgroundImageStyle}
      opacity: 0.08;
      z-index: -1;
    }
    
    .container {
      max-width: 700px;
      margin: 2rem auto;
      padding: 2rem;
    }
    
    .card {
      background-color: var(--card);
      border-radius: var(--radius);
      box-shadow: 0 10px 30px -15px rgba(0, 0, 0, 0.7);
      padding: 2rem;
      margin-bottom: 2rem;
      border: 1px solid var(--border);
    }
    
    
    .header {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
    }
    
    .logo {
      width: 80px;
      height: 80px;
      border-radius: var(--radius);
      object-fit: cover;
      border: 1px solid var(--border);
    }
    
    .title {
      color: var(--foreground);
      margin-bottom: 0.5rem;
      font-weight: 600;
      line-height: 1.2;
    }
    
    .description {
      color: hsl(240 5% 65%);
      margin-bottom: 0.5rem;
    }
    
    .form-group {
      margin-bottom: 1.5rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--foreground);
      font-weight: 500;
      font-size: 0.9rem;
    }
    
    input[type="text"],
    input[type="password"],
    select {
      width: 100%;
      padding: 0.75rem;
      font-size: 0.95rem;
      border: 1px solid var(--input);
      border-radius: var(--radius);
      background-color: hsl(240 5.9% 8%);
      color: var(--foreground);
      margin-top: 0.2rem;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    
    input[type="text"]:focus,
    input[type="password"]:focus,
    select:focus {
      border-color: var(--ring);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
    }
    
    /* Custom checkbox styles */
    .checkbox-wrapper {
      display: flex;
      align-items: center;
      position: relative;
      margin: 0.3rem 0;
      width: 100%;
      background-color: hsl(240 5.9% 8%);
      border-radius: var(--radius);
      border: 1px solid var(--input);
      padding: 0.75rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    
    .checkbox-wrapper:hover {
      border-color: var(--ring);
    }
    
    .checkbox-label {
      display: flex;
      align-items: center;
      cursor: pointer;
      user-select: none;
      font-size: 0.95rem;
      width: 100%;
      margin-bottom: 0rem;
    }
    
    .checkbox-label input[type="checkbox"] {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
    }
    
    .checkmark {
      position: relative;
      display: inline-block;
      flex: 0 0 18px;
      width: 18px;
      height: 18px;
      margin-right: 12px;
      background-color: transparent;
      border: 1px solid var(--border);
      border-radius: 4px;
      transition: all 0.15s ease-in-out;
    }
    
    .checkbox-title {
      flex: 1;
      font-weight: 500;
    }
    
    .checkbox-label:hover input ~ .checkmark {
      border-color: var(--primary);
    }
    
    .checkbox-label input:checked ~ .checkmark {
      background-color: var(--primary);
      border-color: var(--primary);
    }
    
    .checkmark:after {
      content: "";
      position: absolute;
      display: none;
      left: 6px;
      top: 2px;
      width: 4px;
      height: 9px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
    
    .checkbox-label input:checked ~ .checkmark:after {
      display: block;
    }
    
    a {
      text-decoration: none;
    }
    
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background-color: var(--primary);
      color: var(--primary-foreground);
      border: none;
      padding: 0.6rem 1.2rem;
      height: 40px;
      font-size: 0.95rem;
      border-radius: var(--radius);
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      white-space: nowrap;
    }
    
    button:hover {
      background-color: hsl(217 91% 55%);
    }
    
    button:active {
      transform: translateY(1px);
    }
    
    .button-group {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-top: 2rem;
    }
    
    .select-wrapper {
      position: relative;
    }
    
    .select-wrapper::after {
      content: '';
      position: absolute;
      right: 14px;
      top: 50%;
      width: 10px;
      height: 10px;
      pointer-events: none;
      border-right: 2px solid var(--foreground);
      border-bottom: 2px solid var(--foreground);
      transform: translateY(-70%) rotate(45deg);
      opacity: 0.5;
    }
    
    select {
      appearance: none;
      -webkit-appearance: none;
      padding-right: 30px;
    }
    
    .version {
      color: hsl(240 5% 55%);
      text-align: center;
      font-size: 0.85rem;
      margin-top: 2rem;
    }
    
    .copy-button {
      background-color: var(--secondary);
      margin-right: auto;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    
    .copy-button::before {
      content: "";
      display: inline-block;
      width: 16px;
      height: 16px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='9' y='9' width='13' height='13' rx='2' ry='2'%3E%3C/rect%3E%3Cpath d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'%3E%3C/path%3E%3C/svg%3E");
      background-size: contain;
      background-repeat: no-repeat;
    }
    
    .copy-button:hover {
      background-color: hsl(240 5.2% 18%);
    }
    
    .tooltip {
      position: absolute;
      background-color: var(--card);
      color: var(--card-foreground);
      padding: 6px 12px;
      border-radius: var(--radius);
      font-size: 0.8rem;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 10px;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
      border: 1px solid var(--border);
    }
    
    .tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      margin-left: -6px;
      border-width: 6px;
      border-style: solid;
      border-color: var(--border) transparent transparent transparent;
    }
    
    .copy-button-wrapper {
      position: relative;
    }
    
    #installLink button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    
    #installLink button::before {
      content: "";
      display: inline-block;
      width: 16px;
      height: 16px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 5v14'%3E%3C/path%3E%3Cpath d='M5 12h14'%3E%3C/path%3E%3C/svg%3E");
      background-size: contain;
      background-repeat: no-repeat;
    }
    
    @media (max-width: 768px) {
      .container {
        padding: 1rem;
        margin: 1rem auto;
      }
      
      .card {
        padding: 1.5rem;
      }
      
      .header {
        flex-direction: column;
        text-align: center;
        gap: 1rem;
      }
      
      .button-group {
        flex-direction: column;
      }
      
      .copy-button {
        margin-right: 0;
        margin-bottom: 0.5rem;
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="background-container"></div>
  <div class="container">
    <div class="card">
      <div class="header">
        ${manifest.logo ? `<img class="logo" src="${manifest.logo}" alt="${manifest.name || manifest.id} logo">` : ''}
        <div>
          <h1 class="title">${manifest.name || manifest.id}</h1>
          <p class="description">${manifest.description || ''}</p>
        </div>
      </div>
      
      <form id="configForm">
        ${configurationFields
          .map((field: any) => {
            if (field.type === 'checkbox') {
              return `
            <div class="form-group">
              <div class="checkbox-wrapper">
                <label class="checkbox-label">
                  <input type="${field.type}" name="${field.key}" ${field.default === 'true' ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  <span class="checkbox-title">${field.title}</span>
                </label>
              </div>
            </div>`;
            } else if (field.type === 'select') {
              return `
            <div class="form-group">
              <label for="${field.key}">${field.title}</label>
              <div class="select-wrapper">
                <select name="${field.key}" id="${field.key}">
                  ${Object.entries(field.options || {})
                    .map(
                      ([key, value]) => `
                    <option value="${key}" ${field.default === key ? 'selected' : ''}>${value}</option>
                  `
                    )
                    .join('')}
                </select>
              </div>
            </div>`;
            } else {
              return `
            <div class="form-group">
              <label for="${field.key}">${field.title}</label>
              <input type="${field.type}" name="${field.key}" id="${field.key}" ${field.required ? 'required' : ''}>
            </div>`;
            }
          })
          .join('')}
        
        <div class="button-group">
          <div class="copy-button-wrapper">
            <button type="button" id="copyButton" class="copy-button" href="#">Copy Configuration</button>
            <div id="tooltip" class="tooltip">Copied!</div>
          </div>
          <a id="installLink" href="#">
            <button type="button">Add to Stremio</button>
          </a>
        </div>
      </form>
    </div>
    
    <p class="version">Version: ${manifest.version}</p>
  </div>
  
  <script>
    const configForm = document.getElementById('configForm');
    const installLink = document.getElementById('installLink');
    const copyButton = document.getElementById('copyButton');
    const tooltip = document.getElementById('tooltip');
    
    function updateLink() {
      const formData = new FormData(configForm);
      const config = {};
      
      for (const [key, value] of formData.entries()) {
        config[key] = value;
      }
      
      // Handle checkboxes that might not be in formData when unchecked
      document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        if (!formData.has(checkbox.name)) {
          config[checkbox.name] = 'false';
        }
      });
      
      // Create the stremio:// URL
      installLink.href = 'stremio://' + window.location.host + '/' + encodeURIComponent(JSON.stringify(config)) + '/manifest.json';
      copyButton.href = 'https://' + window.location.host + '/' + encodeURIComponent(JSON.stringify(config)) + '/manifest.json';
    }
    
    // Update when form changes
    configForm.addEventListener('change', updateLink);
    
    // Initialize on load
    document.addEventListener('DOMContentLoaded', updateLink);
    
    // "Save Configuration" Button functionality
    installLink.addEventListener('click', function(e) {
      if (!configForm.reportValidity()) {
        e.preventDefault();
      }
    });
    
    // Copy Link Button functionality
    copyButton.addEventListener('click', function() {
      updateLink(); // Ensure the link is up to date
      
      // Create a temporary input element to copy from
      const tempInput = document.createElement('input');
      tempInput.value = copyButton.href;
      document.body.appendChild(tempInput);
      
      // Select and copy the text
      tempInput.select();
      document.execCommand('copy');
      
      // Remove the temporary element
      document.body.removeChild(tempInput);
      
      // Show tooltip
      tooltip.style.opacity = '1';
      
      // Hide tooltip after 2 seconds
      setTimeout(() => {
        tooltip.style.opacity = '0';
      }, 2000);
    });
  </script>
</body>
</html>
`;
}

export default landingTemplate;
