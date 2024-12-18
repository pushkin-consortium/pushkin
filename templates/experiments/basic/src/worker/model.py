class HandednessModel:
    def __init__(self):
        # Initialize model parameters if needed
        pass

    def predict(self, key_press):
        # Simple prediction logic based on key press
        left_keys = ['q', 'w', 'e', 'r', 't', 'a', 's', 'd', 'f', 'g']
        if key_press.lower() in left_keys:
            return 'Left-handed'
        else:
            return 'Right-handed'