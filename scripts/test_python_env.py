import sys

def test_python_environment():
    print("Python version:", sys.version)
    print("Executable:", sys.executable)
    print("Test passed: Python environment is working.")

if __name__ == "__main__":
    test_python_environment()
