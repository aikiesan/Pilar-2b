const React = require("react")

const createMockIcon = (name) => {
  return React.forwardRef((props, ref) => {
    return React.createElement("div", {
      ...props,
      ref,
      "data-testid": `lucide-${name.toLowerCase()}`,
      "data-icon": name,
      role: "img",
      "aria-label": `${name} icon`,
      className: `lucide-icon ${props.className || ""}`.trim(),
    })
  })
}

// Auto-generate a mock for ANY icon name lucide-react exports, so adding a new
// icon to a component never silently breaks its tests with an "Element type is
// invalid" (undefined import) error. A hardcoded allow-list was the root cause
// of the UI a11y suite cascade (Moon, Sun, etc. were missing).
const iconCache = new Map()

module.exports = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === "__esModule") return true
      if (typeof prop !== "string") return undefined
      if (!iconCache.has(prop)) {
        iconCache.set(prop, createMockIcon(prop))
      }
      return iconCache.get(prop)
    },
  }
)
