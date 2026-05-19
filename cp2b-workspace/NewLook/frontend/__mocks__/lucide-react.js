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

module.exports = {
  Globe: createMockIcon("Globe"),
  User: createMockIcon("User"),
  Map: createMockIcon("Map"),
  Settings: createMockIcon("Settings"),
  Search: createMockIcon("Search"),
  Menu: createMockIcon("Menu"),
  X: createMockIcon("X"),
  ChevronDown: createMockIcon("ChevronDown"),
  ChevronUp: createMockIcon("ChevronUp"),
  Home: createMockIcon("Home"),
  Info: createMockIcon("Info"),
  Mail: createMockIcon("Mail"),
  Phone: createMockIcon("Phone"),
}
