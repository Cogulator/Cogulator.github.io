$(document).ready(function (){
    
	if ( $.browser.webkit ) {
		if ( window.location.pathname != "/try-it.html" ) {
			let tryItHTML = "<div id='header_nav'><a href='try-it.html' class='nav_menu smaller smallest'>TRY IT</a></div>";
			$ ('#navi_menu' ).prepend(tryItHTML);
		}
	}
	
	
	$('.hamburger_menu').addClass('hidden_hamburger_menu')
    
    //Hamburger menu
    $('.hamburger').click(function() {
        $('.hamburger').toggleClass('is-active');
        $('.hamburger_menu').toggleClass('hidden_hamburger_menu')
    });
    
});
                