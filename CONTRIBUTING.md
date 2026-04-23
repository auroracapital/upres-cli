# Contributing

## Dev setup

```bash
git clone https://github.com/auroracapital/upres-cli
cd upres-cli

# Node
npm install
npm run build

# Python
pip install -e ".[dev]"
```

## Running tests

```bash
# Node
npm test

# Python
pytest tests/test_client.py -v
```

## Publishing (maintainers)

### npm

```bash
npm run build
npm publish --access public
```

If you need to set up an npm auth token:

```bash
npm login
# creates ~/.npmrc with authToken
```

### PyPI

```bash
pip install build twine
python -m build
twine upload dist/*
```

For PyPI, create a token at https://pypi.org/manage/account/token/ and add it to `~/.pypirc`:

```ini
[pypi]
username = __token__
password = pypi-yourtoken
```
