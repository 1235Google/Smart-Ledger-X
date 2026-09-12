import sys

with open('src/App.tsx', 'r') as f:
    code = f.read()

import_statement = "import MfaChallenge from './components/MfaChallenge';\n"
if "import MfaChallenge" not in code:
    code = code.replace("import ErrorBoundary from './components/ErrorBoundary';", "import ErrorBoundary from './components/ErrorBoundary';\n" + import_statement)

challenge_render = """
  const { requiresMfa } = useStore();
  if (requiresMfa) {
    return <MfaChallenge />;
  }
"""
if "requiresMfa" not in code:
    code = code.replace("  const location = useLocation();", "  const location = useLocation();\n" + challenge_render)

with open('src/App.tsx', 'w') as f:
    f.write(code)

print("done")
