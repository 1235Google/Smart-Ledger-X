import sys

with open('src/context/StoreContext.tsx', 'r') as f:
    code = f.read()

code = code.replace("  const [currentUser, setCurrentUser] = useState<User | null>(null);", "  const [currentUser, setCurrentUser] = useState<User | null>(null);\n  const [requiresMfa, setRequiresMfa] = useState(false);")

with open('src/context/StoreContext.tsx', 'w') as f:
    f.write(code)

print("done")
