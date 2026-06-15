(function(){
  "use strict";
  var stageContainer = document.getElementById("deck");
  var viewSlides     = Array.prototype.slice.call(stageContainer.querySelectorAll(".xo-slide-view"));
  var maxSlides      = viewSlides.length;
  var activeIndex    = 0;
  var isTransitioning = false;
  var cachedTarget   = null;
  var dynamicCounter = document.querySelector(".xo-nav-meta .xo-current-index");
  var linearProgress = document.getElementById("progBar");
  var triggerNav     = document.getElementById("menuBtn");
  var overlayNav     = document.getElementById("navPop");
  var dismissNav     = document.getElementById("navClose");
  var actionPrev     = document.getElementById("prevBtn");
  var actionNext     = document.getElementById("nextBtn");
  var motionReduced  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var backdropCanvas = document.getElementById("stageBg");
  var computedStyles = getComputedStyle(document.documentElement);
  var THEME_MAP      = { 
    "xo-theme-dark": "--dark-ink", 
    "xo-theme-scarlet": "--scarlet", 
    "xo-theme-crimson": "--crimson", 
    "xo-theme-editorial": "--editorial-bone" 
  };
  function getTargetColor(slideInstance){
    var themeKey = ["xo-theme-dark", "xo-theme-scarlet", "xo-theme-crimson", "xo-theme-editorial"].filter(function(className){ 
      return slideInstance.classList.contains(className); 
    })[0] || "xo-theme-dark";
    return computedStyles.getPropertyValue(THEME_MAP[themeKey]).trim() || "#0B0B0B";
  }
  function debounceAction(callback, delay){
    var timeoutId; 
    return function(){ 
      clearTimeout(timeoutId); 
      timeoutId = setTimeout(callback, delay); 
    };
  }
  function initializeTickerTracks(){
    document.querySelectorAll(".xo-ticker-tape").forEach(function(marqueeWrapper){
      var innerTrack = marqueeWrapper.querySelector(".xo-ticker-track");
      if (!innerTrack) return;
      if (innerTrack.dataset.rawHtml === undefined){ 
        innerTrack.dataset.rawHtml = innerTrack.innerHTML; 
      }
      var viewportWidth = marqueeWrapper.clientWidth;
      if (innerTrack.dataset.renderedWidth !== String(viewportWidth)){
        innerTrack.dataset.renderedWidth = String(viewportWidth);
        innerTrack.innerHTML = innerTrack.dataset.rawHtml;
      }
      var iterationGuard = 0;
      while (innerTrack.scrollWidth < viewportWidth * 2 && iterationGuard < 40){
        innerTrack.insertAdjacentHTML("beforeend", innerTrack.dataset.rawHtml);
        iterationGuard++;
      }
      innerTrack.style.animationDuration = Math.max(14, innerTrack.scrollWidth / 110).toFixed(1) + "s";
    });
  }
  function dispatchReveal(activeSlide){
    var targetNodes = activeSlide.querySelectorAll("[data-reveal]");
    targetNodes.forEach(function(node, sequenceIndex){
      if (motionReduced){ 
        node.classList.add("in"); 
        return; 
      }
      setTimeout(function(){ 
        node.classList.add("in"); 
      }, 90 + sequenceIndex * 80);
    });
  }
  setTimeout(function(){
    document.querySelectorAll("[data-reveal]").forEach(function(node){ 
      node.classList.add("in"); 
    });
  }, 3000);
  function formatIndexDigits(num){ 
    return (num < 9 ? "0" : "") + (num + 1); 
  }
  function syncInterfaceState(){
    if (dynamicCounter) dynamicCounter.textContent = formatIndexDigits(activeIndex);
    if (linearProgress) linearProgress.style.width = ((activeIndex + 1) / maxSlides * 100) + "%";
    if (actionPrev) actionPrev.disabled = (activeIndex === 0);
    if (actionNext) actionNext.disabled = (activeIndex === maxSlides - 1);
  }
  var TIME_OUT = 40;  
  var TIME_IN  = 55;  
  var ATMO_GAP = 250; 
  function renderSlideTransition(targetIndex){
    targetIndex = Math.max(0, Math.min(maxSlides - 1, targetIndex));
    if (targetIndex === activeIndex) return;
    if (isTransitioning){ 
      cachedTarget = targetIndex; 
      return; 
    }
    isTransitioning = true;
    var outgoingSlide = viewSlides[activeIndex];
    var incomingSlide = viewSlides[targetIndex];
    activeIndex = targetIndex;
    syncInterfaceState();
    var elementsLeaving = Array.prototype.slice.call(outgoingSlide.querySelectorAll("[data-reveal].in"));
    var elementsEntering = Array.prototype.slice.call(incomingSlide.querySelectorAll("[data-reveal]"));
    elementsEntering.forEach(function(node){ 
      node.classList.remove("in"); 
    });
    var incomingScrollBody = incomingSlide.querySelector(".xo-scroll-container");
    function finalizeTransitionState(){
      viewSlides.forEach(function(slide){ 
        if (slide !== incomingSlide){ 
          slide.classList.remove("active", "leaving", "out"); 
        } 
      });
      isTransitioning = false;
      if (cachedTarget !== null){ 
        var nextTarget = cachedTarget; 
        cachedTarget = null; 
        renderSlideTransition(nextTarget); 
      }
    }
    if (motionReduced){
      if (backdropCanvas) backdropCanvas.style.backgroundColor = getTargetColor(incomingSlide);
      elementsLeaving.forEach(function(node){ node.classList.remove("in"); });
      outgoingSlide.classList.remove("active");
      incomingSlide.classList.add("active");
      if (incomingScrollBody) incomingScrollBody.scrollTop = 0;
      elementsEntering.forEach(function(node){ node.classList.add("in"); });
      finalizeTransitionState();
      return;
    }
    outgoingSlide.classList.add("out");
    elementsLeaving.slice().reverse().forEach(function(node, index){
      setTimeout(function(){ node.classList.remove("in"); }, index * TIME_OUT);
    });
    var evacuationDuration = (elementsLeaving.length ? (elementsLeaving.length - 1) * TIME_OUT : 0) + 180;
    setTimeout(function(){
      if (backdropCanvas) backdropCanvas.style.backgroundColor = getTargetColor(incomingSlide);
      outgoingSlide.classList.remove("active");
      outgoingSlide.classList.add("leaving");
      incomingSlide.classList.add("active");
      if (incomingScrollBody) incomingScrollBody.scrollTop = 0;
    }, evacuationDuration);
    setTimeout(function(){
      elementsEntering.forEach(function(node, index){
        setTimeout(function(){ node.classList.add("in"); }, index * TIME_IN);
      });
    }, evacuationDuration + ATMO_GAP);
    var introductionDuration = (elementsEntering.length ? (elementsEntering.length - 1) * TIME_IN : 0) + 500;
    setTimeout(finalizeTransitionState, evacuationDuration + ATMO_GAP + introductionDuration);
  }
  function executeNext(){ if (activeIndex < maxSlides - 1) renderSlideTransition(activeIndex + 1); }
  function executePrev(){ if (activeIndex > 0) renderSlideTransition(activeIndex - 1); }
  function displayNavigationMenu(){
    overlayNav.open = true; 
    overlayNav.classList.add("open");
    overlayNav.setAttribute("aria-hidden", "false");
    triggerNav.setAttribute("aria-expanded", "true");
  }
  function hideNavigationMenu(){
    overlayNav.classList.remove("open");
    overlayNav.setAttribute("aria-hidden", "true");
    triggerNav.setAttribute("aria-expanded", "false");
  }
  triggerNav.addEventListener("click", displayNavigationMenu);
  dismissNav.addEventListener("click", hideNavigationMenu);
  document.addEventListener("click", function(event){
    var triggerNode = event.target.closest("[data-goto]");
    if (!triggerNode) return;
    event.preventDefault();
    var destinationIndex = parseInt(triggerNode.getAttribute("data-goto"), 10);
    if (!isNaN(destinationIndex)){
      if (overlayNav.classList.contains("open")) hideNavigationMenu();
      renderSlideTransition(destinationIndex);
    }
  });
  actionPrev.addEventListener("click", executePrev);
  actionNext.addEventListener("click", executeNext);
  document.addEventListener("keydown", function(event){
    if (overlayNav.classList.contains("open")){
      if (event.key === "Escape") hideNavigationMenu();
      return;
    }
    switch(event.key){
      case "ArrowRight": case "ArrowDown": case "PageDown":
        event.preventDefault(); executeNext(); break;
      case "ArrowLeft": case "ArrowUp": case "PageUp":
        event.preventDefault(); executePrev(); break;
      case " ":
        event.preventDefault(); executeNext(); break;
      case "Home":
        event.preventDefault(); renderSlideTransition(0); break;
      case "End":
        event.preventDefault(); renderSlideTransition(maxSlides - 1); break;
      default:
        if (/^[1-9]$/.test(event.key)){ 
          event.preventDefault(); 
          renderSlideTransition(parseInt(event.key, 10) - 1); 
        }
    }
  });
  var touchOriginX = 0, touchOriginY = 0, isSwipeTracking = false;
  stageContainer.addEventListener("touchstart", function(event){
    if (event.touches.length !== 1) { isSwipeTracking = false; return; }
    if (event.target.closest && event.target.closest("[data-noswipe]")) { isSwipeTracking = false; return; }
    touchOriginX = event.touches[0].clientX; 
    touchOriginY = event.touches[0].clientY; 
    isSwipeTracking = true;
  }, {passive:true});
  stageContainer.addEventListener("touchend", function(event){
    if (!isSwipeTracking) return;
    isSwipeTracking = false;
    var targetTouch = event.changedTouches[0];
    var deltaX = targetTouch.clientX - touchOriginX;
    var deltaY = targetTouch.clientY - touchOriginY;
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4){
      if (deltaX < 0) executeNext(); else executePrev();
    }
  }, {passive:true});
  (function(){
    var scrollStrip = document.getElementById("galStrip");
    var buttonPrev  = document.getElementById("galPrev");
    var buttonNext  = document.getElementById("galNext");
    if (!scrollStrip || !buttonPrev || !buttonNext) return;
    function calculateStepOffset(){
      var initialCard = scrollStrip.querySelector(".xo-media-frame");
      var structuralStyles = getComputedStyle(scrollStrip);
      var elementGap = parseFloat(structuralStyles.columnGap || structuralStyles.gap) || 14;
      return initialCard ? initialCard.getBoundingClientRect().width + elementGap : scrollStrip.clientWidth * 0.8;
    }
    function evaluateNavigationStatus(){
      var maximumScroll = scrollStrip.scrollWidth - scrollStrip.clientWidth - 1;
      buttonPrev.disabled = scrollStrip.scrollLeft <= 0;
      buttonNext.disabled = scrollStrip.scrollLeft >= maximumScroll;
    }
    var motionBehavior = motionReduced ? "auto" : "smooth";
    buttonPrev.addEventListener("click", function(){ 
      scrollStrip.scrollBy({left: -calculateStepOffset(), behavior: motionBehavior}); 
    });
    buttonNext.addEventListener("click", function(){ 
      scrollStrip.scrollBy({left: calculateStepOffset(), behavior: motionBehavior}); 
    });
    scrollStrip.addEventListener("scroll", function(){ 
      window.requestAnimationFrame(evaluateNavigationStatus); 
    }, {passive:true});
    window.addEventListener("resize", debounceAction(evaluateNavigationStatus, 200));
    evaluateNavigationStatus();
  })();
  if (backdropCanvas) backdropCanvas.style.backgroundColor = getTargetColor(viewSlides[0]);
  dispatchReveal(viewSlides[0]);
  syncInterfaceState();
  initializeTickerTracks();
  if (document.fonts && document.fonts.ready){ 
    document.fonts.ready.then(initializeTickerTracks); 
  }
  window.addEventListener("resize", debounceAction(initializeTickerTracks, 200));
})();