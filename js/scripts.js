$(document).ready(function (){
    $('.hamburger_menu').addClass('hidden_hamburger_menu')
    
    //Hamburger menu
    $('.hamburger').click(function() {
        console.log("click");
        $('.hamburger').toggleClass('is-active');
        $('.hamburger_menu').toggleClass('hidden_hamburger_menu')
    });
    
});
                