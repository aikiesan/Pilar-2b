const React = require("react")

// Like lucide's own icons: decorative (aria-hidden) unless the caller gives
// one a name or a role. This mock used to label every icon ("X icon"), which
// named every icon-only button in the axe tests, including the ones that have
// no name in a real browser.
const hasA11yProp = (props) =>
  Object.keys(props).some((prop) => prop.startsWith("aria-") || prop === "role" || prop === "title")

const createMockIcon = (name) => {
  return React.forwardRef((props, ref) => {
    return React.createElement("div", {
      ...(hasA11yProp(props) || props.children ? {} : { "aria-hidden": "true" }),
      ...props,
      ref,
      "data-testid": `lucide-${name.toLowerCase()}`,
      "data-icon": name,
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
