module.exports = {
  extends: 'eslint:recommended',
  env: {
    node: true
  },
  "parserOptions": {
    "ecmaVersion": 9
  },
  rules: {
    'no-console': 0,
    'no-unused-vars': ['error',{vars: 'local', args: 'none'}]
  }
}
