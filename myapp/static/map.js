var map;
var directionsService;
var directionsRenderer;
var current_city = 'Volos';
var settingStartPoint = false;
var settingEndPoint = false;
var stops = [];
var placesInRoute = [];

function initMap() {
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();

  var cityCenter = {lat: 39.361251, lng: 22.951173};

  map = new google.maps.Map(document.getElementById('map'), {
    center: cityCenter,
    zoom: 16
  });

  directionsRenderer.setMap(map);

  document.getElementById('calculateRouteButton').addEventListener('click', function() {
    calculateRoute();
  });

  document.getElementById('setStartButton').addEventListener('click', function() {
    settingStartPoint = true;
    settingEndPoint = false;
  });

  document.getElementById('setEndButton').addEventListener('click', function() {
    settingStartPoint = false;
    settingEndPoint = true;
  });

  document.getElementById('addStopButton').addEventListener('click', function() {
    var stopInput = document.getElementById('stop_input');
    var stopAddress = stopInput.value;
    getPlace(stopAddress, function(stopResults) {
      if (stopResults) {
        choosePlace(stopResults, stopAddress, function(stopResult) {
          stops.push({location: stopResult, stopover: true});
          stopInput.value = ''; // Clear the stop input
          calculateRoute(); // Automatically calculate the route after adding a stop
        });
      }
    });
  });
  
   

  map.addListener('click', function(event) {
    if (settingStartPoint) {
      var startInput = document.getElementById('start');
      var latLng = event.latLng;
      startInput.value = latLng.lat().toFixed(6) + ', ' + latLng.lng().toFixed(6);
      settingStartPoint = false;
    }
    else if(settingEndPoint){
      var endInput = document.getElementById('end');
      var latLng = event.latLng;
      endInput.value = latLng.lat().toFixed(6) + ', ' + latLng.lng().toFixed(6);
      settingEndPoint = false;
    }
  });
}


function getPlace(query, callback) {
    query = formatQuery(query);
    var request = {
        query: query,
        location: {lat: 39.361251, lng: 22.951173},
        radius: '5000'
    };

    var service = new google.maps.places.PlacesService(map);
    service.textSearch(request, function(results, status) {
        if (status == google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
            callback(results);
        } else {
            // If there are no results or an error, we try a secondary search with the translated version
            var translatedQuery = toGreeklish(query);
            request.query = translatedQuery;
            service.textSearch(request, function(secondaryResults, secondaryStatus) {
                if (secondaryStatus == google.maps.places.PlacesServiceStatus.OK) {
                    callback(secondaryResults);
                } else {
                    alert("Error finding place: " + status);
                    callback(null);
                }
            });
        }
    });
}


function filterByCity(places) {
    return places.filter(function(place) {
      return place.formatted_address.includes(current_city);
    });
}

function showToast(message) {
  var toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  toast.setAttribute('data-autohide', 'false'); // Disable autohide
  toast.innerHTML = `
    <div class="toast-header">
      <strong class="mr-auto">Message</strong>
      <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
    <div class="toast-body">${message}</div>
  `;

  toast.style.position = 'fixed';
  toast.style.top = '10px';
  toast.style.right = '10px';
  toast.style.zIndex = '9999';

  document.body.appendChild(toast);
  $('.toast').toast({ delay: 3000 }); // Set delay
  $('.toast').toast('show');

  setTimeout(function() {
    $('.toast').toast('dispose');
    document.body.removeChild(toast);
  }, 3000);
}



function toGreeklish(input) {
    const greekToLatinMap = {
        'Ά': 'A', 'Α': 'A', 'Β': 'V', 'Γ': 'G', 'Δ': 'D', 'Έ': 'E', 'Ε': 'E', 'Ζ': 'Z', 'Ή': 'I', 'Η': 'I', 'Θ': 'TH',
        'Ί': 'I', 'Ι': 'I', 'Κ': 'K', 'Λ': 'L', 'Μ': 'M', 'Ν': 'N', 'Ξ': 'X', 'Ο': 'O', 'Ό': 'O', 'Π': 'P', 'Ρ': 'R', 'Σ': 'S',
        'Τ': 'T', 'Ύ': 'Y', 'Υ': 'Y', 'Φ': 'F', 'Χ': 'X', 'Ψ': 'PS', 'Ώ': 'O', 'Ω': 'O'
    };

    return input.replace(/[Ά-Ώα-ω]/g, function (match) {
        return greekToLatinMap[match] || match.toLowerCase();
    }).normalize('NFD').replace(/[\u0300-\u036f]/g, ""); // Remove accents/diacritics
}

  
function choosePlace(places, originalQuery, callback) {
  console.log("Original places:", places);
  places = filterByCity(places);
  console.log("Filtered by city:", places);
  
  originalQuery = formatQuery(originalQuery);
        
  if (places.length === 0) {
    alert('No relevant results found in ' + current_city + '. Please try again.');
    return;
  } else if (places.length === 1) {
    // If only one option matches, select it automatically
    if (stops.some(stop => stop.location === places[0].formatted_address)) {
      showToast('This point is already a part of your route!');
      document.getElementById('stop_input').value = ''; // Clear the 'Stops' input
      $('#choosePlaceModal').modal('hide');
    } else {
      callback(places[0].formatted_address);
    }
    return;
  }

  var choosePlaceBody = document.getElementById('choosePlaceBody');
  choosePlaceBody.innerHTML = '';

  for (var i = 0; i < places.length; i++) {
    var addressPart = places[i].formatted_address.split(',')[0];
    var button = document.createElement('button');
    button.className = 'btn btn-primary btn-block';
    button.innerText = (i + 1) + ". " + places[i].name + " - " + addressPart;
    button.onclick = (function(place) {
      return function() {
        if (stops.some(stop => stop.location === place.formatted_address)) {
          showToast('This point is already a part of your route!');
          document.getElementById('stop_input').value = ''; // Clear the 'Stops' input
          $('#choosePlaceModal').modal('hide');
        } else {
          callback(place.formatted_address);
          $('#choosePlaceModal').modal('hide');
        }
      };
    })(places[i]);
    choosePlaceBody.appendChild(button);
  }

  $('#choosePlaceModal').modal('show');
}




function formatQuery(query) {
    query = query.charAt(0).toUpperCase() + query.slice(1).toLowerCase();
    return toGreeklish(query);
  }
  
function calculateRoute() {
    var startAddress = document.getElementById('start').value;
    var endAddress = document.getElementById('end').value;
  
    getPlace(startAddress, function(startResults) {
      if (startResults) {
        choosePlace(startResults, startAddress, function(startResult) {
          getPlace(endAddress, function(endResults) {
            if (endResults) {
              choosePlace(endResults, endAddress, function(endResult) {
                var request = {
                  origin: startResult,
                  destination: endResult,
                  travelMode: 'WALKING',
                  waypoints: stops,
                  optimizeWaypoints: true
                };
  
                directionsService.route(request, function(result, status) {
                  if (status == 'OK') {
                    directionsRenderer.setDirections(result);
  
                    // Calculate total distance
                    var totalDistance = 0;
                    var route = result.routes[0];
  
                    for (var i = 0; i < route.legs.length; i++) {
                      totalDistance += route.legs[i].distance.value;
                    }
  
                    totalDistance = (totalDistance / 1000).toFixed(2); // Convert to kilometers
                    
                    // Calculate total duration based on the total distance and an average walking speed of 5 km/h
                    var totalDuration = (totalDistance / 5) * 60; // Convert to minutes
                    var totalDurationHours = Math.floor(totalDuration / 60);
                    var totalDurationMinutes = Math.round(totalDuration % 60);
  
                    // Display them in the 'routeInfo' div using Bootstrap classes
                    document.getElementById('routeInfo').innerHTML =
                      '<div class="alert alert-info">' +
                      '<strong>Distance:</strong> ' + totalDistance + " km" +
                      '<br><strong>Duration:</strong> ' + totalDurationHours + "h " + totalDurationMinutes + "m" +
                      '</div>';
                  } else {
                    alert("Error finding route: " + status);
                  }
                });
              });
            }
          });
        });
      }
    });
}
  

  

document.getElementById('resetButton').addEventListener('click', function() {
  location.reload();
});

google.maps.event.addDomListener(window, 'load', initMap);
