/*
  jQuery mcalc.logoExample - @VERSION

  (c) Maxime Haineault <haineault@gmail.com> 
  http://haineault.com - http://motion-m.ca

  License: MIT License (http://www.opensource.org/licenses/mit-license.php)
*/

$.ui.mcalc.component({
    name: 'logoExample',
    lazy: true,
    help: 'jQuery.mcalc is sponsored by Motion Média, a company that provide a wide variety of multimedia services for businesses and organizations.',
    defaults: { 
        logoExample:      true,
        logoExampleUrl:   'http://motion-m.ca/',
        logoExampleSrc:   'img/motion-media.png',
        logoExampleTitle: '',
        logoExampleAlt:   'Mortgage Loan Place'
    },
    tpl: '<img />',
    events: [
        {type: 'ready', callback: function(e, ui){
            var logo = $(this).attr({
                alt: ui.options.logoExampleAlt,
                src: ui.options.logoExampleSrc
            });
            if (ui.options.logoExampleUrl) {
                logo.attr({
                    longdesc: ui.options.logoExampleTitle,
                    border: 0
                });
                logo = $('<a style="display:block;text-align:center;" />').append(logo).attr({
                    title: ui.options.logoExampleTitle,
                    href:  ui.options.logoExampleUrl
                });
            }
            logo.css({margin: '10px 20px 0 20px'});
            ui._component('formpane').prepend(logo);
        }}
    ]
});
