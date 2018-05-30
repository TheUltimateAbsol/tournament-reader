chrome.storage.local.get(function(result){console.log(result)});
chrome.storage.local.clear();

function onFinish(){
	console.log ("Hello World");
	window.open("index.html");
}

function getFile(filename, callback)
  { oxmlhttp = null;
    try
      { oxmlhttp = new XMLHttpRequest();
        oxmlhttp.overrideMimeType("text/html");
      }
    catch(e)
      { 
    	return null
      }
    if(!oxmlhttp) return null;
    try
      { oxmlhttp.open("GET",filename,true);
      	oxmlhttp.send(null);
      }
    catch(e)
      { return null;
      }
    oxmlhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
        	var parser = new DOMParser();
        	var xmlDoc = parser.parseFromString(this.responseText, "text/html");''
        	callback(xmlDoc);
        }
	  };
  }

function removeElementsByClass(root, className){
    var elements = root.getElementsByClassName(className);
    while(elements.length > 0){
        elements[0].parentNode.removeChild(elements[0]);
    }
}
function parseDate(dateString){
	let atPos = dateString.indexOf("at");
	let date = dateString.substring(0, atPos);
	let time = dateString.substring(atPos + 2);
	return Date.parse(date + time) / 1000;
}

function packagePost(item, id){
	var node = item.cloneNode(true);
	
	let user = node.getAttribute("data-author");
	let date = 123;
	let html = undefined;
	
	let pc = node.getElementsByClassName("primaryContent")[0];
	if (pc){
		let editDate = pc.getElementsByClassName("editDate")[0];
		let signature = pc.getElementsByClassName("signature")[0];
		let messageMeta = pc.getElementsByClassName("messageMeta")[0];
		
		//Set date
		if(messageMeta) {
//			console.log("message found");
			let privateControls = messageMeta.getElementsByClassName("privateControls")[0];
			if (privateControls){
//				console.log("privateControls found");
				let mutedItem = privateControls.getElementsByClassName("muted")[0];
				if (mutedItem){
//					console.log("mutedItem found");
					let datePermalink = mutedItem.getElementsByClassName("datePermalink")[0];
					if (datePermalink){
//						console.log("datePermalink found");
						let dateTime = datePermalink.getElementsByClassName("DateTime")[0];
						if (dateTime){
//							console.log("dateTime found");
							let dateString = dateTime.getAttribute("data-datestring");
							let timeString = dateTime.getAttribute("data-timestring");
							date = parseDate(dateString + " at " + timeString); //Inefficient
						}
					}
				}
			}
		}
		
		if(editDate) pc.removeChild(editDate);
		if(signature) pc.removeChild(signature);
		if(messageMeta) pc.removeChild(messageMeta);
	}
	
	//Expand image URLs
	(Array.from(node.getElementsByTagName("img"))).forEach(function (image){
		let absolute = image.src;
		image.setAttribute("src", absolute);
	});
	
	//Strip links from User info
	let userInfo = node.getElementsByClassName("messageUserInfo")[0];
	if (userInfo){
		(Array.from(userInfo.getElementsByTagName("a"))).forEach(function (link){
			link.removeAttribute("href");
		});
	}
	
	//Remove New indicator
	removeElementsByClass(node, "newIndicator");
	
	let wrap = document.createElement('div');
	wrap.appendChild(node);
	html = wrap.innerHTML;

	return {
		id : id,
		user : user,
		date : date,
		html : html,
		type : "pokebeach"
	};
}

//Set default end page
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  chrome.tabs.executeScript(
      tabs[0].id,
      {file: 'getNumPages.js'},
      function(value){
    	  document.getElementById("end").value = value;
      });
  document.getElementById("submit").onclick = function(){
	  let start = document.getElementById("start").value;
	  let end = document.getElementById("end").value;
	  let url = tabs[0].url;
	  url = url.substr(0, url.lastIndexOf('/') + 1);
	  
	  //Switch out display elements
	  let progress = document.getElementById("master-load");
	  progress.style.display = "block";
	  progress.max = end - start + 1;
	  this.style.display = "none";
	  progress.onchange = function(){
		  console.log("HELLO WORLD");
		if (progress.position === 1)
			console.log("DONE");
	  }
	  
	  for (let i = start; i <= end; i++ ){
		  let site = getFile(url+"page-" + i, function(site){
			  let x = Array.from(site.getElementsByClassName("message"));
			  let y = Array.from(site.getElementsByClassName("deleted"));
			  let z = Array.from(site.getElementsByClassName("quickReply"));
			  x = x.filter(function(e){return this.indexOf(e)<0;},y);
			  x = x.filter(function(e){return this.indexOf(e)<0;},z);
			  
			  let subProgress = document.createElement("progress");
			  document.getElementById("sub-load").appendChild(subProgress);
			  
			  subProgress.max = x.length;
			  
			  x.forEach(function (item) {
			  	let id = item.id;
			  	
				chrome.storage.local.set({[id] : packagePost(item, id)}, function() {
					//TODO when message is recorded
					subProgress.value++;
					if (subProgress.position === 1)
					{
						document.getElementById("master-load").value++;
						if(document.getElementById("master-load").position === 1)
							onFinish();
					}
						
					//console.log (id + " saved!")
				});
			  })
			  
			  
		  });
	  }
  }
});
