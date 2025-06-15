from setuptools import setup, find_packages

setup(
    name="accounting_app",
    version="0.1",
    packages=find_packages(),
    install_requires=[
        'flask',
        'flask-cors',
        'python-dotenv',
        'pyjwt',
        'werkzeug',
        'gunicorn'
    ],
)
