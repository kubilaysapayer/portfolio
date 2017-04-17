$(".myBox").click(function(){
window.location=$(this).find("a").attr("href");
return false;
});

var _gaq = _gaq || [];

_gaq.push(['_setAccount', 'UA-21076529-1']);

_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

var nav = document.getElementByClass('nav'),
    header = document.getElementByClass('header'),
    headerOffset = header.offsetHeight;

function scrollFunction() {
  var scrollTop = document.body.scrollTop;

  if (scrollTop > headerOffset) {
    nav.classList.add('nav-background');
  } else {
    nav.classList.remove('nav-background');
  }
}

window.onscroll = scrollFunction;
