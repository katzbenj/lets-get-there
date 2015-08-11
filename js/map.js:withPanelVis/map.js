///BUGS:
//      FINISHED! Will not update for new selections if map area does not change
//      Will not work well if route is too long
//      No geolocation yet
//      Add filter for time of arrival
//      FINISHED! Search bar in mobile screen
//      remove simmilar addresses

var directionsDisplay;
var directionsService = new google.maps.DirectionsService();
var map;
var infowindow;
var placeService;
var distanceService;
var poi = [];    //points of interest
var dest;		
var startDest;
var endDest;
var mTOmiles = 0.621371 / 1000;		//meters to miles
var key = 'AIzaSyA32JH6-Qc3KhtRulM7egFyE4VTns5He0U';	//key used to get site statistics from google
var numPlaces = 0;
var rowName;
var numToPrint;	//number of locations to print
var staticNumPrint = 8;		//num locations to add each time more results is clicked
var moreResultsBut = false;	//determines if more results button should be displayed
var outputDiv;
var yourLocation;

function initialize() {
  outputDiv = document.getElementById('directionsPanel');
  //removeRows();
  //numPlaces = 0;
  //numToPrint = staticNumPrint;
  directionsDisplay = new google.maps.DirectionsRenderer();
  var chicago = new google.maps.LatLng(41.850033, -87.6500523);
  var mapOptions = {
    zoom: 5,
    center: chicago,
    scrollwheel: false,
    draggable: false
  }
  map = new google.maps.Map(document.getElementById('banner'), mapOptions);
  directionsDisplay.setMap(map);
  //directionsDisplay.setPanel(document.getElementById("directionsPanel"));
  infoWindow = new google.maps.InfoWindow();
  placeService = new google.maps.places.PlacesService(map);
  var location = getLocation();
}

function newRoute() {
    load();
    removeRows();
    numPlaces = 0;
    numToPrint = staticNumPrint;
	startDest = document.getElementById('begin').value;
    endDest = document.getElementById('finish').value;
    info.innerHTML = "";
    directionsPanel.innerHTML = "";
    clearMarkers();
    calcRoute(startDest, endDest);
}

function calcRoute(start, end) {
  var request = {
      origin:start,
      destination:end,
      travelMode: google.maps.TravelMode.DRIVING
  };
  directionsService.route(request, function(response, status) {
    if (status == google.maps.DirectionsStatus.OK) {
      directionsDisplay.setDirections(response);
      performSearch(response.routes[0].bounds);
    }
    else {
    outputDiv.innerHTML = 'Directions Service Error: ' + status;
      return
    }
  });
  //google.maps.event.addListenerOnce(map, 'tilesloaded', function() {
  //google.maps.event.addListenerOnce(map, 'bounds_changed', function() {
	//performSearch();
  //});
  
}

function performSearch(bound) {
  var stop = document.getElementById('stop').value;
  var request = {
    bounds: bound,
    keyword: stop,
    key: key
  };
  placeService.nearbySearch(request, distanceMatrix);
}


function distanceMatrix(results, status) {
  if (status != google.maps.places.PlacesServiceStatus.OK) {
    outputDiv.innerHTML = "Nearby Search Error: " + status;
    return;
    }
  var orig = [startDest, endDest];
  var dest = [endDest];
  for (var i = 0; i < results.length; i++) {
    dest.push(results[i].geometry.location);
    poi.push(new loc());
    poi[i].name = results[i].name;
    poi[i].location = results[i];
    //if (i < 5) {
    //  getAddress(results[i], i)
    //}
  }
  var service = new google.maps.DistanceMatrixService();
  service.getDistanceMatrix(
    {
      origins: orig,
      destinations: dest,
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC,
      avoidHighways: false,
      avoidTolls: false
    }, dmCallback); 
}

function getAddress(result, number) {
  var request = {
      placeId: result.location.place_id,
      key: key
    };
    addElement();
    placeService.getDetails(request, function(place, status) {
      if (status == google.maps.places.PlacesServiceStatus.OK) {
        poi[number].address = place.address_components;
        }
        poi[number].addressStatus = status;
	  //addElement();
      var placeInfo = document.getElementById('place'+(number));
        insertPhoto(number);
        var distanceTxt = "miles";
        if (round((poi[number].totalDist - destDist.value) * mTOmiles, 1) == 1) {
          distanceTxt = "mile";
        }
        var timeTxt = "mins";
        if (round((poi[number].totalTime - destTime.value)/60, 0) == 1) {
          timeTxt = "min";
        }
        var timeTxt2 = "mins";
        if (round((poi[number].time1)/60, 0) == 1) {
          timeTxt2 = "min";
        }
        var addedTime = timeConvert(round((poi[number].totalTime - destTime.value)/60, 0))
        var addedDist = round((poi[number].totalDist - destDist.value) * mTOmiles, 1)
        placeInfo.innerHTML = "<h3>" + (number + 1) + ": " + poi[number].name + '</h3>' +
        "<em>" + greaterThan0(addedTime) + '<b>' + addedTime + '</b> ' + timeTxt + " &#8226 " +
        greaterThan0(addedDist) + '<b>' + addedDist + '</b> ' + distanceTxt + '</em><br>' +
        //"</h3>Added Time: <em><b>" +
        //timeConvert(round((poi[number].totalTime - destTime.value)/60, 0)) +"</b> " + timeTxt + " (" + 
        //timeConvert(round((poi[number].totalTime)/60, 0)) + ' total) </em><br>Added Dist:  <em><b>' + 
        //round((poi[number].totalDist - destDist.value) * mTOmiles, 1) + "</b> " + distanceTxt + " (" +
        //round(poi[number].totalDist * mTOmiles, 1) + ' total)' + '</em><br>' + 
        //"Midpt Arvl:<t>   <em>" + timeConvert(round((poi[number].time1)/60, 0)) + " " + timeTxt2 + '</em><br>' +
        addressPrint(number, placeInfo);
        if (number == numToPrint - 1) {
          doneLoading();
        }
    });
}

function greaterThan0(value) {
  if(value > 0) {
    return '+';
  }
  return '-';
}

function addressPrint(num, divElement) {
  var address = [];
  address[0] = addressInfo(num, "street_number");
  address[1] = addressInfo(num, "route");
  address[2] = addressInfo(num, "locality");
  address[3] = addressInfo(num, "administrative_area_level_1");
  address[4] = addressInfo(num, "postal_code");
  for (var i = 0; i < address.length - 1; i++) {//its ok if postal code is not present
    if (address[i] == "") {
      return "Address information Unavailable";
    }
  }
  var completeAddress = address[0] + " " +
        address[1] + "<br> " + 
        address[2] + ", " + 
        address[3] + " " + 
        address[4]; 
  return completeAddress;
}

function addressInfo(num, component) {
  if (poi[num].addressStatus == google.maps.places.PlacesServiceStatus.OK) {
	  for(var i = 0; i < poi[num].address.length; i++) {
		for(var j = 0; j < poi[num].address[i].types.length; j++) {
		  if (poi[num].address[i].types[j] == component) {
			return poi[num].address[i].long_name;
		  }
		}
	  }
	}
  return "";
}


function insertPhoto(num) {
  var photos = poi[num].location.photos;
  if (!photos) {
    return;
  }
  document.getElementById('pic'+(num)).src = photos[0].getUrl({'maxWidth': 160, 'maxHeight': 144});
  }
  
function dmCallback(response, status) {
  if (status != google.maps.DistanceMatrixStatus.OK) {
    outputDiv.innerHTML = 'Distance Matrix Error was: ' + status;
  } 
  else {
    var origins = response.originAddresses;
    var destinations = response.destinationAddresses;
	var start = response.rows[0].elements;
	var finish = response.rows[1].elements;
	destTime = start[0].duration
	destDist = start[0].distance
      for (var j = 1; j < start.length; j++) {
        //addMarker(destinations[j], true);
        poi[j - 1].time1 = start[j].duration.value;
        poi[j - 1].time2 = finish[j].duration.value;
        poi[j - 1].totalTime = poi[j - 1].time1 + poi[j - 1].time2;
        poi[j - 1].dist1 = start[j].distance.value;
        poi[j - 1].dist2 = finish[j].distance.value;
        poi[j - 1].totalDist = poi[j - 1].dist1 + poi[j - 1].dist2;
        //outputDiv.innerHTML += '<br>' + j + ': ' 
        //    + ': ' + (start[j].distance.value + finish[j].distance.value)/1000 + ' km in '
        //   + (start[j].duration.value + finish[j].duration.value)/60  + 'minutes';
    }
  }
  outputDiv.innerHTML += '<h2><center>Normal Time = ' + destTime.text + ' for ' + round(destDist.value * mTOmiles, 1)
   + ' miles</center></h2>';
   quickSort(0, poi.length - 1);
   screenUpdate(0);
  //for (var i = 0; i < poi.length; i++) {
    //outputDiv.innerHTML += '<br>' + (i + 1) + ': ' + poi[i].name + ': ' + round((poi[i].totalTime)/60, 0) + ' mins for ' 
    //+ round(poi[i].totalDist * mTOmiles, 1) + ' miles';
   // createMarker(poi[i].location, i + 1);
 // }
  //var placeInfo = document.getElementById('a');
  //var num = 0;
  //placeInfo.innerHTML = "<h3>" + poi[num].name + "</h3>" + poi[num].address + '<br>' + round((poi[num].totalTime)/60, 0) + ' mins for ' 
  //  + round(poi[num].totalDist * mTOmiles, 1) + ' miles'; 
}

//decides how many more places to add to screen
function morePlaces(){
  if(poi.length >= numToPrint + 8) {
    numToPrint += 8;
  }
  else {
    numToPrint = poi.length;
  }
  screenUpdate(numPlaces);
}

//adds more places to the screen
function screenUpdate(startVal) {
  for (var i = startVal; i < poi.length && i < numToPrint; i++) {
     getAddress(poi[i], i);
     createMarker(poi[i].location, i + 1);
  }
  moreResults();
}

//creates more results button
function moreResults(){
  if(!moreResultsBut && poi.length > numPlaces) {
    var parent = document.getElementById('moreResults');
    var child = document.createElement('button.fit');
    var id = 'moreButton';
    child.setAttribute('id', id);
    child.setAttribute('class', 'button');
    child.setAttribute('type', 'button');
    child.setAttribute('onclick', "morePlaces();");
    child.innerHTML="More Results";
    parent.appendChild(child);
    moreResultsBut = true;
  }
  if (moreResultsBut && poi.length <= numPlaces) {
    var parent = document.getElementById('moreResults');
    var child = document.getElementById('moreButton');
    parent.removeChild(child);  
    moreResultsBut = false;
  }
}

function createMarker(place, number) {
  var iconURL = 'https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=' + number + '|FFFF00|000000'
  var marker = new google.maps.Marker({
    map: map,
    position: place.geometry.location,
    icon : iconURL
  });
  //poi.push(new loc());
  poi[number - 1].marker = marker;
  //var x = document.getElementById('directionsPanel');
  //placeService.getDetails(place, function(result, status) {
  //	if (status != google.maps.places.PlacesServiceStatus.OK) {
  //		x.innerHTML = x.innerHTML + " " + status;
  //  }
  //  else {
    	//x.innerHTML = x.innerHTML + "<br>" + (number) + place.name;
  //  }
  //});
  google.maps.event.addListener(marker, 'click', function() {
    placeService.getDetails(place, function(result, status) {
      if (status != google.maps.places.PlacesServiceStatus.OK) {
          infoWindow.setContent(status);
          infoWindow.open(map, marker);
      }
      infoWindow.setContent(place.name);
      infoWindow.open(map, marker);
    });
  });
}

function clearMarkers() {
  for (var i = 0; i < poi.length && i < numToPrint; i++) {
    poi[i].marker.setMap(null);
  }
  poi = [];
}

function loc() {
  this.name = "Name Information Unavailable";
  this.location;
  this.time1;
  this.time2;
  this.totalTime;
  this.dist1;
  this.dist2;
  this.totalDist;
  this.marker;
  this.pic
  this.address;
  this.addressStatus;
}

function round(num, decPlace) {
  numRound = Math.pow(10, decPlace);
  return Math.round(num * numRound)/numRound;
}

function timeConvert(num) {
  var returnValue;
  var hours = Math.floor(num/60);
  var min = num % 60;
  if (hours > 1) {
    return (hours + " hrs " + min);
  }
  else if (hours == 1) {
    return (hours + " hr " + min);
  }
  return min;
}
function quickSort(left, right) {
  range = right - left;
  if (left < 0) {
    directionsPanel.innerHTML += "<br>Left Error";
  }
  if (right > poi.length) {
    directionsPanel.innerHTML += "<br>Right Error";
  }
  for (i = 0; i < poi.length; i++) {
    for (j = i + 1; j < poi.length; j++) {
     if (poi[i].totalTime == poi[j].totalTime) {
       //directionsPanel.innerHTML += "<br>poi repeat Error";
       }
    }
  }
  if (range == 0) {
    return;
  }
  else {
    pivot = Math.floor((Math.random() * range) + left);
    if (pivot >= 20) {
      info.innerHTML += "PIVOT ERROR";
    }
    //info.innerHTML += left + " " + right + " " + pivot + '<br>';
    temp = poi[left];
    piv = poi[pivot];
    poi[left] = piv;
    poi[pivot] = temp;
    boundary = left;
    for (sort = left + 1; sort <= right; sort++) {
      //quickPrint(left, right, boundary, piv, pivot, sort);
      if (piv.totalTime > poi[sort].totalTime) {
        temp = poi[sort];
        poi[sort] = poi[boundary + 1];
        poi[boundary + 1] = temp;
        boundary++;
      }
    }

    poi[left] = poi[boundary];
    poi[boundary] = piv;
    if (boundary - 1 >= left) {
      quickSort(left, boundary - 1);
    }
    if (boundary + 1 <= right) {
      quickSort(boundary + 1, right);
    }
  }
}

function quickPrint(left, right, boundary, piv, pivot, examine) {
  directionsPanel.innerHTML = "<br>Bound: " + boundary + " piv: " + pivot;
  for (i = 0; i < poi.length; i++) {
    var space = "";
    var bound = ""
    var str = poi[i].totalTime + " ";
    if (i >= left && i <= right) {
      space = "____";
    }
    if (poi[i] == piv) {
      str = str.concat(" PIVOT");
      str = str.fontcolor("green");
    }
    if (i == boundary) {
      bound = "BOUNDARY";
      bound = bound.fontcolor("red");
    }
    if (i == examine) {
      str = str.concat(" EXAMINE");
      str = str.fontcolor("blue");
    }
    directionsPanel.innerHTML += '<br>' + space + str + bound;
  }
}
google.maps.event.addDomListener(window, 'load', initialize);

function addElement(){
  if (numPlaces % 2 == 0) {
    rowName = addRow()
  }

  addPlace(rowName);
}

function addRow() {
  var divToUse = document.getElementById('places');
  var outerdiv = document.createElement('div');
  var divIdName = 'row' + Math.floor(numPlaces/2);
  outerdiv.setAttribute('class',"row");
  outerdiv.setAttribute('id',divIdName);
  //outerdiv.innerHTML = 'Element Number '+numPlaces+' has been added! <a href=\'#\' \'>Remove the div "'+divIdName+'"</a>';
  divToUse.appendChild(outerdiv);
  return divIdName;
}

function addPlace(row) {
   //Make section
   currentNum = numPlaces;
   numPlaces += 1
   var divToUse = document.getElementById(row);
   var sec = document.createElement('section'); 
   sec.setAttribute('class',"6u");
   divToUse.appendChild(sec);
   
   //Make div for pic and writing
   var boxDiv = document.createElement('div');
   boxDiv.setAttribute('class',"box post");
   sec.appendChild(boxDiv);
   
   //create ref
   var ref = document.createElement('a');
   ref.setAttribute('href',"#");
   ref.setAttribute('class',"image left");
   boxDiv.appendChild(ref);
   
   //create image
   var pic = document.createElement('img');
   var picIdName = 'pic'+currentNum;
   pic.setAttribute('id',picIdName);
   pic.setAttribute('src',"");
   pic.setAttribute('alt',"");
   pic.setAttribute('width',"160");
   pic.setAttribute('height',"144");
   ref.appendChild(pic);
   
   //Make div for writing
   var innerDiv = document.createElement('div');
   innerDiv.setAttribute('class', "inner");
   var divIdName = 'place' + currentNum;
   innerDiv.setAttribute('id', divIdName);
   //innerDiv.innerHTML = "<h3>The First Thing</h3>";
   boxDiv.appendChild(innerDiv);
   }
  
function load(){
  /*var loadGif = createElement("title", "img");
  var loadGif = document.getElementById("title");
  //var parent =  document.getElementById("title");
  loadGif.setAttribute('id',"loadGif");
  loadGif.setAttribute('src',"http://www.erdekesseg.hu/wp-content/uploads/loading-anim.gif");
  loadGif.setAttribute('alt',"");
  loadGif.setAttribute('width',"20");
  loadGif.setAttribute('height',"20");*/
  loadGif.setAttribute('style',"display: inline");
}

function doneLoading() {
	var loadGif = document.getElementById("loadGif");
	loadGif.setAttribute('style',"display: none");

}
   
function removeRows() {
  for (var i = 0; i < Math.ceil(numPlaces/2) && numPlaces > 0; i++) {
    var parent = document.getElementById('places');
    var child = document.getElementById("row" + i);
    parent.removeChild(child);
    }
}

function createElement(parentId, childType) {
  var parent = document.getElementById(parentId);
  var child = document.createElement(childType);
  parent.appendChild(child);
  return child;
}

function getLocation() {
    var timeoutVal = 10000;
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(recordPos, displayError, {timeout: timeoutVal,});
    } 
    else {
       	 outputDiv.innerHTML = "Geolocation is not supported by this browser.";
       	 var chicago = new google.maps.LatLng(41.850033, -87.6500523);
         var mapOptions = {
           zoom: 8,
           center: chicago,
           scrollwheel: false
          }
         map = new google.maps.Map(document.getElementById('banner'), mapOptions);
         directionsDisplay.setMap(map);
         doneLoading();
         panelVisible(true);
    }
}

function recordPos(position) {
  var pos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
  map.setZoom(15);
  map.setCenter(pos);
  yourLocation = new google.maps.Marker({
    map: map,
    position: pos,
  });
  infoWindow.setContent("You are here");
  infoWindow.open(map, yourLocation);
  doneLoading();
  panelVisible(true);
}

function panelVisible(value){
  var panel = document.getElementById('skel-layers-wrapper');
  if (typeof(panel)!== 'undefined') {
    if(value) {
      panel.style.transform = "translate(" + panelWidth + "px, 0px)";
      changeDiv("skel-layers-inactiveWrapper", "skel-layers-activeWrapper");
    }
    else {
      panel.style.transform = "translate(0px, 0px)";
    }
  }
}

function changeDiv(oldPar, newPar) {
	var newParent = document.getElementById(newPar);
	var oldParent = document.getElementById(oldPar);
	
	while (oldParent.childNodes.length > 0) {
		newParent.appendChild(oldParent.childNodes[0]);
	}
}

function displayError(error) {
  var errors = { 
    1: 'Geolocation Permission denied',
    2: 'Position unavailable',
    3: 'Geolocation Request timeout'
  };
  alert("Error: " + errors[error.code]);
  doneLoading();
  panelVisible(true);
}