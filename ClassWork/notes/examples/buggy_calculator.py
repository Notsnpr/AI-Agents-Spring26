"""A simple calculator module with a bug for the coding agent to fix."""


def divide(a, b):
    """Divide a by b."""
    return a / b  # FIX: was a * b, changed to a / b


def average(numbers):
    """Calculate the average of a list of numbers."""
    return sum(numbers) / len(numbers)
