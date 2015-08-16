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
var poi = [];	 //points of interest
var dest;
var startDest;
var endDest;
var mTOmiles = 0.621371 / 1000;		//meters to miles	
var googKey = 'AIzaSyBAbywmo00_5ljkLL_XcfJyRSquJjFwxSU';	//key used to get site statistics from google
var numPlaces = 0;	//number of places returned by server
var rowName;
var numToPrint;	//number of locations to print
var staticNumPrint = 8;		//num locations to add each time more results is clicked
var moreResultsBut = false;	//determines if more results button should be displayed
var outputDiv;
var yourLocation;		//marker for your location
var yourPos;			//your latLong
var markerIterator;	//records which marker must be added next
var expandRadius =0;
var expandCoef=16000; //about 10 miles
var metersPerMin=75/60*1609/2; //going 75 miles per hour the number of meters the person will travel in 30 seconds, only half because it is rate of increase of radius
var maxETA = 13;  //number of time steps used for latest arrival
var etaStep = 5;
var searchRad = 0;
var searchCenter;
var maxSearchDist = 50000 //maximum number of meters radius of search can be
var minSearchDist = 16000 // minimum number of meters we are willing to allow the radius of the search to be (if we let it get too small people traveling small distances will get no results)
var searchArea ='';
var directions;

//calls initialize on window load
google.maps.event.addDomListener(window, 'load', initialize);

//sets a map centered at chicago and then adds an info window with your location if possible
function initialize() 
{
	
	/*$('[data-slider]').on('change.fndtn.slider', function(){
  if (document.getElementById("eta").value == 25) 
      {
      	document.getElementById("sliderOutput3").innerHTML = "Max ETA: Any Time";
      }
      else 
      {
      	document.getElementById("sliderOutput3").innerHTML = "Max ETA: " + timeConvert(document.getElementById("eta").value * 5) + " mins" ;
      }
});*/
  	outputDiv = document.getElementById('directionsPanel');
  	directionsDisplay = new google.maps.DirectionsRenderer();
  	var chicago = new google.maps.LatLng(41.850033, -87.6500523);
  	var mapOptions = 
  	{
    	zoom: 5,
    	center: chicago,
    	scrollwheel: false,
   	 	draggable: true
  	}
  
  	map = new google.maps.Map(document.getElementById('banner'), mapOptions);
  	directionsDisplay.setMap(map);
  	infoWindow = new google.maps.InfoWindow();
  	placeService = new google.maps.places.PlacesService(map);
  	var location = getLocation();
  	
  	//Adds autoinput
  	var endInput = /** @type {HTMLInputElement} */(
      document.getElementById('finish'));
	var autocomplete1 = new google.maps.places.Autocomplete(endInput);
  	autocomplete1.bindTo('bounds', map);
  	
	var startInput = /** @type {HTMLInputElement} */(
      document.getElementById('begin'));
	var autocomplete2 = new google.maps.places.Autocomplete(startInput);
  	autocomplete2.bindTo('bounds', map);

  	//make text boxes highlight all input on click
	highlight(startInput);
  	highlight(endInput);
  	highlight(document.getElementById('stop'));

}

function newRoute()
{
	expandRadius=0;	
	constructRoute();
}

function expandSearch()
{
	removeSearchBut();
	expandRadius+=1;
	constructRoute();
}

//Function called by website when new route is proposed (submit button pressed)
function constructRoute() 
{
    load();
    changePanel("hide");
    removeRows();	//clear any left over data
    numPlaces = 0;
    startDest = document.getElementById('begin').value;
    endDest = document.getElementById('finish').value;
    var info = document.getElementById('directionsPanel');
    info.innerHTML = "";	//clear output
    directionsPanel.innerHTML = "";		//clear output
    clearMarkers();		//clear any residual markers
    numToPrint = staticNumPrint;
    markerIterator = 0;	//makes it so markers will be added appropriately
    moreResults();
    if (startDest == "Current Location") 	//if Cur.Loc that means start Loc should be yourPos
    {		
    	startDest = yourPos;
    }
    
    calcRoute(startDest, endDest);  //sends directions request from start to end destination
    								//also initializes other searches
}

//Function sends direction request and displaying directions if possible, and printing error
//otherwise.  Also calls perform search
function calcRoute(start, end) 
{
  	var request = 
  	{
      origin:start,
      destination:end,
      travelMode: google.maps.TravelMode.DRIVING
  	};
  
  	directionsService.route(request, function(response, status) {
		if (status == google.maps.DirectionsStatus.OK) 
		{
      	directionsDisplay.setDirections(response);
      	directions = response;
      	if (yourLocation) 	//only set initialized marker to null
      	{
      		yourLocation.setMap(null);
      	}
      	
     	performSearch(response.routes[0].bounds);
    	}
    
   	 	else 
    	{
    		outputDiv.innerHTML = 'Directions Service Error: ' + status;
    		doneLoading();
      		return
    	}
    
  });
  
  /*google.maps.event.addListenerOnce(map, 'tilesloaded', function() {
  google.maps.event.addListenerOnce(map, 'bounds_changed', function() {
	performSearch();
  });*/
  
}

//does a nearby search using bounds of map found in calc route 
//and calls distanceMatrix as a callback
function performSearch(bound) 
{
    var stop = document.getElementById('stop').value;
	/*searchRad=0;
	greaterCircalDist = = greaterCircleDistance(bound.getCenter(), bound.getNorthEast());
	findSearchCenter(greaterCircalDist, bound);
	if (greaterCircalDist > minSearchDist) {
		searchRad= greaterCircalDist;
	}
	else {  //min search distance
		searchRad= minSearchDist;
	}
	if (document.getElementById("eta").value  < maxETA) { //a maximum time until arrival has been set
	    searchRad=document.getElementById("eta").value * etaStep * metersPerMin;
	}
	searchRad = searchRad + expandRadius*expandCoef;
	if (searchRad > maxSearchDist) { //max search distance
	   searchRad=maxSearchDist	
	} 
	*/
		var searchVals = findSearchCenter(bound);
	var request = 
  	{
    	location: searchVals.center,
    	radius: searchVals.radius, //about 10 miles
    	keyword: stop,
   	 key: googKey
 	 };
  placeService.nearbySearch(request, distanceMatrix);
}

//Initializes poi and calls distance matrix service
function distanceMatrix(results, status) 
{
  	if (status != google.maps.places.PlacesServiceStatus.OK) 
  	{
   	 	if (status=="ZERO_RESULTS")
   	 	{
   	 		searchArea= new google.maps.Circle({
		      strokeColor: '#FF0000',
		      strokeOpacity: 0.8,
		      strokeWeight: 2,
		      fillColor: '#FF0000',
		      fillOpacity: 0.35,
		      map: map,
		      center: map.getBounds().getCenter(),
		      radius: searchRad
		    });
   	 		outputDiv.innerHTML ="<b>No Results Found</b> <br>Consider checking search parameters or expanding search radius";
   	 		expandSearchButton();	
   	 	}
   	 	else
   	 	{
   	 		outputDiv.innerHTML = "Nearby Search Error: " + status;
   	 	}
   	 	doneLoading();
   	 	return;
	}
  showArea()
  var orig = [startDest, endDest];
  var dest = [endDest];
  for (var i = 0; i < results.length; i++) 	//for each result of search add loc variable to poi
  {
    dest.push(results[i].geometry.location);
    poi.push(new loc());
    poi[i].name = results[i].name;
    poi[i].location = results[i];
  }
  
  //call distance matrix service for info about distance between start, end and stopOver locations
  //calls dmCallback
  var service = new google.maps.DistanceMatrixService();
  service.getDistanceMatrix(
    {
      origins: orig,
      destinations: dest,
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC,
      avoidHighways: false,
      avoidTolls: false
    }
    
    , dmCallback); 
}

//Does a place service request, and then adds an element to the screen with all relavent 
//Info such as address, distance, etc...
function getAddress(result, number) {
 	var request =
  	{
      placeId: result.location.place_id,
      key: googKey
	};
	
    addElement();
    placeService.getDetails(request, function(place, status) 	//place distance service request
    {
      	if (status == google.maps.places.PlacesServiceStatus.OK) 
      	{
        	poi[number].address = place.address_components;
        }
        
        poi[number].addressStatus = status;
      	var placeInfo = document.getElementById('place'+(number));
        insertPhoto(number);
        
        ////Determine if distance or time should be singular or plural
        var distanceTxt = "miles";
        
        if (round((poi[number].totalDist - destDist.value) * mTOmiles, 1) == 1) 
        {
          distanceTxt = "mile";
        }
        
        var timeTxt = "mins";
        
        if (round((poi[number].totalTime - destTime.value)/60, 0) == 1) 
        {
          timeTxt = "min";
        }
        
        var timeTxt2 = "mins";
        
        if (round((poi[number].time1)/60, 0) == 1) 
        {
          timeTxt2 = "min";
        }
        ////////////////////
        
        var addedTime = timeConvert(round((poi[number].totalTime - destTime.value)/60, 0));	//time added by stop over
        var addedDist = round((poi[number].totalDist - destDist.value) * mTOmiles, 1);		//Distance added by stop over
        var eta = round(poi[number].time1/60, 0); //time until stop
        placeInfo.innerHTML = "<center><h3>" + (number + 1) + 			//prints info of poi to site
        			": " + poi[number].name + '</h3>' +
        			"<em>" + '<b>' + addedTime + '</b> ' + 
        			timeTxt + " &#8226 " + //dot 
        			'<b>' + addedDist + '</b> ' + distanceTxt + 
       	 			'</em><br>eta: ' + 
       	 			'<b>' + eta + ' </b>' + timeTxt + '<br>' +
        			addressPrint(number, placeInfo) + '</center>';
    });
}

//returns the string '+' if num is positive or '-' if negative
function greaterThan0(value) 
{
  if(value > 0) 
  {
    return '+';
  }
  
  return '-';
}

//compiles a formatted address and returns it as a string
function addressPrint(num, divElement) 
{
  var address = [];
  address[0] = addressInfo(num, "street_number");
  address[1] = addressInfo(num, "route");
  address[2] = addressInfo(num, "locality");
  address[3] = addressInfo(num, "administrative_area_level_1");
  address[4] = addressInfo(num, "postal_code");
  for (var i = 0; i < address.length - 1; i++) //its ok if postal code is not present
  {
    if (address[i] == "") 
    {
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

//google address info comes back in non deterministic way
//Must search through every element of the array and see if any match the desired type
//Return empty string if not found
function addressInfo(num, component) 
{
  if (poi[num].addressStatus == google.maps.places.PlacesServiceStatus.OK) //check for valid location
  {
	  for(var i = 0; i < poi[num].address.length; i++) 	//for all values of address array
	  {
		for(var j = 0; j < poi[num].address[i].types.length; j++) 	//
		{	
		  if (poi[num].address[i].types[j] == component) 	//if desired type found
		  {
			return poi[num].address[i].long_name;
		  }
		  
		}
		
	  }
	  
	}
	
  return "";
}

//Inserts the photo for a given poi
function insertPhoto(num) 
{
  var photos = poi[num].location.photos;
  if (!photos) 	//if no photo present, return null
  {
    return;
  }
  
  //set picture to url
  document.getElementById('pic'+(num)).src = photos[0].getUrl({'maxWidth': 160, 'maxHeight': 144});
}

//Sets time and distance values for all poi, sorts  and prints normal time of travel on screen
function dmCallback(response, status) 
{
  if (status != google.maps.DistanceMatrixStatus.OK) 
  {
    outputDiv.innerHTML = 'Distance Matrix Error was: ' + status;
  } 
  
  else 
  {
    var origins = response.originAddresses;
    var destinations = response.destinationAddresses;
	var start = response.rows[0].elements;
	var finish = response.rows[1].elements;
	destTime = start[0].duration
	destDist = start[0].distance
    for (var j = 1; j < start.length; j++) 
    {
   	 	poi[j - 1].time1 = start[j].duration.value;
       	poi[j - 1].time2 = finish[j].duration.value;
     	poi[j - 1].totalTime = poi[j - 1].time1 + poi[j - 1].time2;
      	poi[j - 1].dist1 = start[j].distance.value;
      	poi[j - 1].dist2 = finish[j].distance.value;
      	poi[j - 1].totalDist = poi[j - 1].dist1 + poi[j - 1].dist2;
    }
    
  }
   outputDiv.innerHTML = '<h2><center>Normal Time = ' + destTime.text + ' for ' + round(destDist.value * mTOmiles, 1)
   							+ ' miles</center></h2>';
   quickSort(0, poi.length - 1);
   if (document.getElementById("eta").value != maxETA) //check if there are eta restrictions
   {
   		for (var i = 0; i < poi.length; i++)  //determine if any locations should be eliminated due to eta restrictions
   		{
   			if (Math.floor(poi[i].time1/60) > document.getElementById("eta").value * etaStep + expandCoef/(metersPerMin)) 
   			{
   				poi.splice(i, 1);
   				i--;//done to not miss any values after one has been deleted
   			}
   		}
   }
	if (poi.length > 0) //check that there are valid results
  	{
		screenUpdate(numPlaces);
  	}
  	else 
  	{
  		doneLoading();
  		if (document.getElementById("eta").value != 25) 
  		{
  			outputDiv.innerHTML = "<center>No results found. <br>Try increasing max ETA</center>";
  		}
  		else 
  		{
  			outputDiv.innerHTML = "<center>No results found.</center>";
  		}
  	}
}


//decides how many more places to add to screen
function morePlaces()
{
  if(poi.length >= numToPrint + staticNumPrint) 
  {
    numToPrint += staticNumPrint;
  }
  
  else 
  {
    numToPrint = poi.length;
  }
  load();
  screenUpdate(numPlaces);
}

//adds more places to the screen
function screenUpdate(startVal) 
{
  for (var i = startVal; i < poi.length && i < numToPrint; i++) 
  {
 	getAddress(poi[i], i);
	setTimeout(function() //drop markers in a scattered configuration
   	{
		createMarker(poi[markerIterator].location, markerIterator + 1);
    	doneLoading();
 	}, i * 200);
  }
  moreResults();
  expandSearchButton();	
}

//creates more results button
function moreResults()
{
  if(!moreResultsBut && poi.length > numPlaces) //if no results button is not on screen and there are more 
  {												//potential places to print
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
  
  if (moreResultsBut && poi.length <= numPlaces) 	//If more results button on screen and there will not
  {													//be any places left to print
    var parent = document.getElementById('moreResults');
    var child = document.getElementById('moreButton');
    parent.removeChild(child);  
    moreResultsBut = false;
  }
  
}

function expandSearchButton()
{
	if (!moreResultsBut && poi.length < 20 && searchRad <maxSearchDist) //No more results button and there are less results than we would like to have, and room to expand
	{
		var parent = document.getElementById('moreResults');
		var child = document.createElement('button.fit');
		var id = 'expandSearchButton';
          child.setAttribute('id', id);
		child.setAttribute('class', 'button');
		child.setAttribute('type', 'button');
		child.setAttribute('onclick', "expandSearch();");    
		child.innerHTML="Expand Search Area";
	    parent.appendChild(child);
	  }
}

function removeSearchBut()
{
	
    var parent = document.getElementById('moreResults');
    var child = document.getElementById('expandSearchButton');
    parent.removeChild(child); 
}

//creates marker for given location, and creates listener for if marker is pressed
function createMarker(place, number) 
{
	//url for marker with correct number and color
	markerIterator++;
	var iconURL = 'https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=' + number + '|FFFF00|000000'
  	var marker = new google.maps.Marker(	//call to google server to create a marker for given location
  	{
    	map: map,
    	position: place.geometry.location,
    	animation: google.maps.Animation.DROP,
    	icon : iconURL
  	});
  	
  	poi[number - 1].marker = marker;	//record marker so it can be deleted
  	google.maps.event.addListener(marker, 'click', function() //add listener to make marker interactive
  	{
    	placeService.getDetails(place, function(result, status) 	//google place service request
    	{
      		if (status != google.maps.places.PlacesServiceStatus.OK) 
      		{
         		infoWindow.setContent(status);
          		infoWindow.open(map, marker);
      		}
      			
     		infoWindow.setContent(place.name);	//opens window with place name
      		infoWindow.open(map, marker);
    	});
  	});
}

//removes all markers on screen (except for ones associated with driving directions) and sets poi to null
function clearMarkers() 
{
  for (var i = 0; i < poi.length && i < numToPrint; i++) 
  {
    poi[i].marker.setMap(null);
  }
  if (searchArea != '') {
  	searchArea.setMap(null);
  }
  searchArea='';
  poi = [];
}

//struct that contains all relavent information about a location
function loc() 
{
  this.name = "Name Information Unavailable";
  this.location;	//all location info given by distance matrix
  this.time1;		//time from origin to loc
  this.time2;		//time from loc to destination
  this.totalTime;	//time from origin to loc to destination
  this.dist1;		//distance from origin to loc
  this.dist2;		//distance from loc to destination
  this.totalDist;	//distance from origin to loc to destination
  this.marker;		//marker informatin
  this.pic			//picture information
  this.address;		//contains all address information
  this.addressStatus;	//contains info on whether address information is valid
}

//rounds number to specified number of decimal places
function round(num, decPlace) 
{
  numRound = Math.pow(10, decPlace);
  return Math.round(num * numRound)/numRound;
}

//converts seconds to a string for minutes and hours
function timeConvert(num) 
{
  var returnValue;
  var hours = Math.floor(num/60);
  var min = num % 60;
  if (hours > 1) 	//if multiple hours
  {
  	  return (hours + " hrs " + min);
  }
  
  else if (hours == 1) 	//if single hour
  {
  	  return (hours + " hr " + min);
  }
  
  return min;	//if no hours
}

//sorts poi by total time of trip with stop over using quicksort
function quickSort(left, right) 
{
  range = right - left;
  if (left < 0) 
  {
    directionsPanel.innerHTML += "<br>Left Error";
  }
  
  if (right > poi.length) 
  {
    directionsPanel.innerHTML += "<br>Right Error";
  }

  if (range == 0) {
    return;
  }
  
  else 
  {
    pivot = Math.floor((Math.random() * range) + left);
    temp = poi[left];
    piv = poi[pivot];
    poi[left] = piv;
    poi[pivot] = temp;
    boundary = left;
    for (sort = left + 1; sort <= right; sort++) 
    {
      //quickPrint(left, right, boundary, piv, pivot, sort);
      if (piv.totalTime > poi[sort].totalTime) 
      {
        temp = poi[sort];
        poi[sort] = poi[boundary + 1];
        poi[boundary + 1] = temp;
        boundary++;
      }
      
    }

    poi[left] = poi[boundary];
    poi[boundary] = piv;
    if (boundary - 1 >= left) 
    {
      quickSort(left, boundary - 1);
    }
    
    if (boundary + 1 <= right) 
    {
      quickSort(boundary + 1, right);
    }
  }
}

//function to help debug quickSort
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

//called when new location is to be printed, ensures proper space is initialized
function addElement()
{
  if (numPlaces % 2 == 0) //if numPlaces is odd, then we can add next place to same row
  {
    rowName = addRow()
  }

  addPlace(rowName);	//creates location for new place
}

//Creates a new row
function addRow() 
{
  var divToUse = document.getElementById('places');
  var outerdiv = document.createElement('div');		//creates a div element
  var divIdName = 'row' + Math.floor(numPlaces/2);
  outerdiv.setAttribute('class',"row");				//sets class as row
  outerdiv.setAttribute('id',divIdName);			//names it the proper row number 
  //outerdiv.innerHTML = 'Element Number '+numPlaces+' has been added! <a href=\'#\' \'>Remove the div "'+divIdName+'"</a>';
  divToUse.appendChild(outerdiv);					//adds it to the parent element
  return divIdName;
}


function addPlace(row) 
{
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
  
//sets load gif
function load()
{
  loadGif.setAttribute('style',"z-index: 100000");
}

//removes load gif
function doneLoading() {
	var loadGif = document.getElementById("loadGif");
	loadGif.setAttribute('style',"z-index: 0");
}

//remove all rows with place information   
function removeRows() 
{
  	for (var i = 0; i < Math.ceil(numPlaces/2) && numPlaces > 0; i++) 
  	{
	    var parent = document.getElementById('places');
	    var child = document.getElementById("row" + i);
    	parent.removeChild(child);
	}	
}

/*
//function creates new element
function createElement(parentId, childType) 
{
  var parent = document.getElementById(parentId);
  var child = document.createElement(childType);
  parent.appendChild(child);
  return child;
}*/

//geolocation function that gets location and ends loading
//times out after 10 seconds
//centers on Chicago if geolocation fails
function getLocation() 
{
    var timeoutVal = 30000;    
    if (navigator.geolocation)
    {
        navigator.geolocation.getCurrentPosition(recordPos, displayError, {timeout: timeoutVal,});
    }
     
    else 
    {
       	outputDiv.innerHTML = "Geolocation is not supported by this browser.";
       	var chicago = new google.maps.LatLng(41.850033, -87.6500523);
        var mapOptions = 
        {
         	  zoom: 8,
         	  center: chicago,
         	  scrollwheel: false
        }
        
        map = new google.maps.Map(document.getElementById('banner'), mapOptions);
        directionsDisplay.setMap(map);
        doneLoading();
    }
}

//Makes a marker for your geoLocation
function recordPos(position) 
{
  yourPos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
  map.setZoom(15);
  map.setCenter(yourPos);
  iconURL = 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
  yourLocation = new google.maps.Marker(
  {
    map: map,
    position: yourPos,
    icon: iconURL,
    animation: google.maps.Animation.DROP
  });
  
  infoWindow.setContent("You are here");
  infoWindow.open(map, yourLocation);
  doneLoading();
  setTimeout(function() //drop markers in a scattered configuration
    {
    	changePanel("show");
    }, 1500);
}

//displays geolocation errors
function displayError(error) 
{
  var errors = 
  { 
    1: 'Geolocation Permission denied',
    2: 'Position unavailable',
    3: 'Geolocation Request timeout'
  };
  
  alert("Error: " + errors[error.code]);
  doneLoading();
  document.getElementById('begin').value = "Detroit";
  changePanel("show");
}

//hides/shows nav Panel if one exists
function changePanel(action)
{
	if (typeof skel.plugins.layers.get('navPanel') != "undefined")
	{
		if(action == "show") 
		{
			skel.plugins.layers.show('navPanel');
		}
		else 
		{
			skel.plugins.layers.hide('navPanel');
		}
	}
}


//highlights all text of a text box when clicked
function highlight(textBox)
{
    textBox.onfocus = function() 
    {
        textBox.select();

        // Work around Chrome's little problem
        textBox.onmouseup = function() 
        {
            // Prevent further mouseup intervention
            textBox.onmouseup = null;
            return false;
        };
        
    };
}


function greaterCircleDistance(start, end) {	
	//var center = bounds.getCenter();
	//var ne = bounds.getNorthEast();
		// r = radius of the earth in statute miles
	//var r = 3963.0;  
	var r = 6371000;  
	
	// Convert lat or lng from decimal degrees into radians (divide by 57.2958)
	var lat1 = start.lat() / 57.2958; 
	var lon1 = start.lng() / 57.2958;
	//var lon1=0
	var lat2 = end.lat() / 57.2958;
	var lon2 = end.lng() / 57.2958;
	//var lon2=0
	
	// distance = circle radius from center to Northeast corner of bounds
	var dis = r * Math.acos(Math.sin(lat1) * Math.sin(lat2) + 
	  Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1));
	  return dis
	}
	
function showArea()
{
   	 		searchArea= new google.maps.Circle({
		      strokeColor: '#FF0000',
		      strokeOpacity: 0.8,
		      strokeWeight: 2,
		      fillColor: '#FF0000',
		      fillOpacity: 0.35,
		      map: map,
		      center: searchCenter,
		      radius: searchRad
		    });
		}

function findSearchCenter(bounds)
{
	var distance = greaterCircleDistance(bounds.getCenter(), bounds.getNorthEast());
	if (document.getElementById("eta").value == maxETA)	//no arrival time restrictions, make sure trip is less than 50,000 meters in radius
	{
		if (distance < maxSearchDist)
		{
			searchRad = distance;
			if (distance > minSearchDist)
			{
				searchCenter = bounds.getCenter() 	
			}
			else 
			{
				searchCenter= minSearchDist;			
			}
		}
		else //drive is too long, find suitable center location
		{
			searchRad = maxSearchDist;
			searchCenter = findCenterOfDirections(maxSearchDist, "distance");
		}
	}
	else //eta restrictions present
	{
		searchCenter = findCenterOfDirections(document.getElementById("eta").value * 5 * 60 / 2, "duration");
		var startLoc = directions.routes[0].legs[0].start_location;
		searchRad = greaterCircleDistance(searchCenter, startLoc) + 1000; //add a kilometer
	}
	if (searchRad > maxSearchDist)
	{
		searchRad = maxSearchDist;
	}
	var searchVal = {
		center: searchCenter,
		radius: searchRad + expandCoef * expandRadius
	};
	return searchVal;
}

function findCenterOfDirections(maxVal, attribute) //attribute must be 'distance' or 'duration' (for time)
{
		var steps = directions.routes[0].legs[0].steps;
		var val = 0;
		var inc = 0;
		while (val < maxVal)
		{
			val += steps[inc][ attribute ].value;
						marker(steps[inc].start_location);
			inc += 1;
		}
				inc -= 1;
		var lastStep = steps[inc][ attribute ].value;
		var excessVal= val - maxVal;
		
				var ratio = excessVal / lastStep;
				var tempStepToUse = Math.ceil(ratio * steps[inc].path.length);
		
				var stepToUse = 0;
				for (var i=1; i < steps[inc].path.length && excessVal >0; i+=1)
				{
					if (attribute == "duration")
					{
						var totalStepTime = steps[inc].duration.value;
						var totalStepDist = steps[inc].distance.value;
						var avgSpeed = totalStepDist / totalStepTime;
						var distTraveled = greaterCircleDistance(steps[inc].path[i],steps[inc].path[i-1]);
						excessVal -= distTraveled / avgSpeed;
					}
					else
					{
						excessVal -= greaterCircleDistance(steps[inc].path[i],steps[inc].path[i-1]);
					}
					stepToUse = i;
				}
			
				
		return steps[inc].path[stepToUse];
}

function marker(locVal) {
	
					var marker = new google.maps.Marker(	//call to google server to create a marker for given location
				{
    					map: map,
    					position: locVal,
    					animation: google.maps.Animation.DROP,
  				});
 }