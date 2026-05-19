# Accessibility Guidelines for CP2B Maps V3

This document outlines accessibility standards and testing procedures for the CP2B Maps V3 platform, ensuring WCAG 2.1 Level AA compliance.

## 📋 Table of Contents

- [Overview](#overview)
- [Standards & Compliance](#standards--compliance)
- [Testing Infrastructure](#testing-infrastructure)
- [Development Guidelines](#development-guidelines)
- [Component-Specific Guidelines](#component-specific-guidelines)
- [Testing Procedures](#testing-procedures)
- [CI/CD Integration](#cicd-integration)
- [Resources](#resources)

## 🎯 Overview

CP2B Maps V3 is committed to providing an accessible experience for all users, including those using assistive technologies. Our platform follows WCAG 2.1 Level AA standards to ensure content is perceivable, operable, understandable, and robust.

## 📊 Standards & Compliance

### WCAG 2.1 Level AA Requirements

Our platform adheres to the following accessibility principles:

1. **Perceivable**: Information and UI components must be presentable in ways users can perceive
2. **Operable**: UI components and navigation must be operable
3. **Understandable**: Information and operation of UI must be understandable
4. **Robust**: Content must be robust enough for a wide variety of user agents

### Key Compliance Areas

- **Color Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Keyboard Navigation**: All interactive elements must be keyboard accessible
- **Screen Reader Support**: Proper ARIA attributes and semantic HTML
- **Focus Management**: Clear focus indicators and logical tab order
- **Alternative Text**: Meaningful alt text for all images
- **Form Labels**: Proper labels and instructions for all form controls

## 🧪 Testing Infrastructure

### Automated Testing Tools

- **jest-axe**: Automated accessibility testing in unit tests
- **@axe-core/react**: Runtime accessibility monitoring (development)
- **eslint-plugin-jsx-a11y**: Linting rules for accessibility

### Installation & Setup

```bash
# Frontend dependencies are already installed
cd frontend
npm install

# Run accessibility tests
npm run test:a11y

# Run all tests with accessibility checks
npm test
```

### Test Configuration

Accessibility tests are configured in:
- `src/test/utils/accessibility.ts` - Testing utilities
- `jest.config.js` - Jest configuration with axe-core
- `.eslintrc.json` - ESLint accessibility rules

## 💻 Development Guidelines

### Semantic HTML

Use semantic HTML elements whenever possible:

```tsx
// ✅ Good
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/dashboard">Dashboard</a></li>
    <li><a href="/map">Map</a></li>
  </ul>
</nav>

// ❌ Avoid
<div className="navigation">
  <div className="nav-item" onClick={handleClick}>Dashboard</div>
</div>
```

### ARIA Attributes

Use ARIA attributes to enhance semantic meaning:

```tsx
// ✅ Loading states
<div role="status" aria-live="polite">
  <span className="sr-only">Loading...</span>
</div>

// ✅ Interactive elements
<button
  aria-expanded={isOpen}
  aria-haspopup="true"
  aria-label="Open menu"
>
  Menu
</button>

// ✅ Form validation
<input
  aria-invalid={hasError}
  aria-describedby={hasError ? "error-message" : undefined}
/>
```

### Focus Management

Ensure proper focus management:

```tsx
// ✅ Focus trapping in modals
useEffect(() => {
  if (isModalOpen) {
    const firstFocusable = modalRef.current?.querySelector('[tabindex="0"]')
    firstFocusable?.focus()
  }
}, [isModalOpen])

// ✅ Skip links for keyboard users
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

### Color and Contrast

Ensure sufficient color contrast:

```css
/* ✅ High contrast colors */
.button-primary {
  background-color: #1B5E20; /* CP2B dark green */
  color: #FFFFFF; /* White text - 12.6:1 contrast ratio */
}

/* ✅ Error states with sufficient contrast */
.error-text {
  color: #C62828; /* Dark red - 5.1:1 contrast ratio */
}
```

## 🧩 Component-Specific Guidelines

### Form Components

```tsx
// ✅ Accessible form field
<div>
  <label htmlFor="email">Email Address *</label>
  <input
    id="email"
    type="email"
    required
    aria-invalid={errors.email ? 'true' : 'false'}
    aria-describedby={errors.email ? 'email-error' : 'email-help'}
  />
  <div id="email-help">We'll never share your email</div>
  {errors.email && (
    <div id="email-error" role="alert">
      {errors.email}
    </div>
  )}
</div>
```

### Navigation Components

```tsx
// ✅ Accessible navigation
<nav aria-label="Main navigation" role="navigation">
  <ul>
    <li>
      <Link
        href="/dashboard"
        aria-current={pathname === '/dashboard' ? 'page' : undefined}
      >
        Dashboard
      </Link>
    </li>
  </ul>
</nav>
```

### Data Visualization

```tsx
// ✅ Accessible charts
<div role="img" aria-labelledby="chart-title" aria-describedby="chart-desc">
  <h3 id="chart-title">Biogas Potential by Region</h3>
  <p id="chart-desc">
    Bar chart showing biogas potential across 5 regions.
    São Paulo leads with 150 MW, followed by Minas Gerais with 120 MW.
  </p>
  <Chart data={data} />
</div>
```

### Interactive Maps

```tsx
// ✅ Accessible map component
<div
  role="application"
  aria-label="Interactive biogas potential map"
  aria-describedby="map-instructions"
>
  <div id="map-instructions" className="sr-only">
    Use arrow keys to pan the map, plus and minus to zoom.
    Press Enter on regions to view details.
  </div>
  <MapComponent />
</div>
```

## 🧪 Testing Procedures

### Automated Testing

Create accessibility tests for all components:

```tsx
// Component.a11y.test.tsx
import { testWCAGAA, createA11yTestSuite } from '@/test/utils/accessibility'

describe('Component Accessibility', () => {
  it('should meet WCAG 2.1 Level AA standards', async () => {
    await testWCAGAA(<Component />)
  })

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<Component />)

    // Test keyboard interactions
    await user.tab()
    await user.keyboard('{Enter}')
    // Assert expected behavior
  })
})
```

### Manual Testing Checklist

#### Keyboard Navigation
- [ ] All interactive elements are focusable with Tab
- [ ] Focus indicators are clearly visible
- [ ] Tab order is logical and intuitive
- [ ] All functionality available with keyboard
- [ ] Escape key closes modals/dropdowns

#### Screen Reader Testing
- [ ] Test with NVDA (Windows) or VoiceOver (Mac)
- [ ] All content is announced correctly
- [ ] Landmarks and headings are properly identified
- [ ] Form fields have appropriate labels
- [ ] Error messages are announced

#### Visual Testing
- [ ] Color contrast meets WCAG AA standards
- [ ] Text is readable when zoomed to 200%
- [ ] Content is usable in high contrast mode
- [ ] Focus indicators are visible in all themes

### Browser Testing

Test accessibility across supported browsers:
- Chrome with ChromeVox
- Firefox with NVDA
- Safari with VoiceOver
- Edge with Narrator

## 🔄 CI/CD Integration

Accessibility checks are integrated into our CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Run accessibility tests
  run: npm run test:a11y -- --ci --passWithNoTests

- name: ESLint accessibility rules
  run: npm run lint
```

### Pre-commit Hooks

Accessibility tests run on every commit:

```bash
# .husky/pre-commit
npm run test:a11y -- --bail --passWithNoTests
```

## 🎯 Performance Monitoring

### Lighthouse Accessibility Scores

Target scores for all pages:
- **Accessibility**: 95+ (out of 100)
- **Best Practices**: 90+
- **SEO**: 90+

### Axe DevTools

Use axe DevTools browser extension for real-time accessibility monitoring during development.

## 🔧 Common Issues & Solutions

### Issue: Missing Alt Text
```tsx
// ❌ Problem
<img src="/logo.png" />

// ✅ Solution
<img src="/logo.png" alt="CP2B Maps - Biogas Potential Platform" />
```

### Issue: Unlabeled Form Fields
```tsx
// ❌ Problem
<input placeholder="Enter email" />

// ✅ Solution
<label htmlFor="email">Email Address</label>
<input id="email" type="email" placeholder="Enter email" />
```

### Issue: Insufficient Color Contrast
```css
/* ❌ Problem - 2.5:1 ratio */
color: #8BC34A; /* Light green */
background: #FFFFFF;

/* ✅ Solution - 4.9:1 ratio */
color: #2F7D32; /* Darker green */
background: #FFFFFF;
```

## 📚 Resources

### WCAG Guidelines
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Accessibility Checklist](https://webaim.org/standards/wcag/checklist)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)

### Screen Readers
- [NVDA Screen Reader](https://www.nvaccess.org/download/) (Windows)
- [VoiceOver Guide](https://webaim.org/articles/voiceover/) (macOS)

### Design Resources
- [Inclusive Design Principles](https://inclusivedesignprinciples.org/)
- [A11y Project](https://www.a11yproject.com/)

## 🤝 Contributing

When contributing to accessibility improvements:

1. **Test Early**: Run accessibility tests during development
2. **Review Guidelines**: Follow this document's guidelines
3. **Manual Testing**: Test with keyboard and screen readers
4. **Document Changes**: Update this guide when adding new patterns
5. **Seek Review**: Have accessibility changes reviewed by team members

## 📝 Changelog

### v1.0.0 (Current)
- Initial accessibility infrastructure setup
- WCAG 2.1 Level AA compliance framework
- Automated testing with jest-axe
- ESLint accessibility rules
- CI/CD integration
- Comprehensive documentation

---

For questions or suggestions regarding accessibility, please create an issue or contact the development team.