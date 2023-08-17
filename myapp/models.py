from django.db import models

class Road(models.Model):
    name = models.CharField(max_length=200)
    status = models.CharField(max_length=50) # e.g. "normal", "hard", "impossible"
    polyline = models.TextField() # store polyline data for the road
