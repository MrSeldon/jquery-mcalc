/*
  jQuery mcalc.about - @VERSION

  (c) Maxime Haineault <haineault@gmail.com> 
  http://haineault.com - http://motion-m.ca

  License: MIT License (http://www.opensource.org/licenses/mit-license.php)
*/

(function($){
// i18n
function _(str, args) { return $.i18n('mcalc', str, args); }

$.ui.mcalc.defaults.summaryPrint = true;

$.tpl('summary.informations', [
    $.format('<h1>{0:s}</h1>', _('Mortgage summary')),
    '<dl class="ui-widget-content ui-summary">',
        $.format('<dt>{0:s}</dt>', _('Interest rate')),
                 '<dd>{interest:s}%</dd>',
        $.format('<dt>{0:s}</dt>', _('Term')),
                 '<dd>{term:s}</dd>',
        $.format('<dt>{0:s}</dt>', _('Principal')),
                 '<dd>{principal:s}</dd>',
        $.format('<dt class="no-border">{0:s}</dt>', _('Property taxes')),
                 '<dd class="no-border">{propretyTax:s}%</dd>',
    '</dl>'
]);
$.tpl('summary.monthlyPayments', [
    $.format('<h2>{0:s}</h2>', _('Monthly schedule')),
    '<dl class="ui-widget-content ui-summary">',
        $.format('<dt>{0:s}</dt>', _('Mortgage')),
        '<dd><small>{monthlyPeriods:s} x </small>{monthlyPayment:s} = {monthlyTotal:s}</dd>',
        $.format('<dt>{0:s}</dt>', _('Taxes')),
        '<dd><small>{monthlyPeriods:s} x </small>{monthlyPaymentTax:s} = {monthlyTotalTax:s}</dd>',
        $.format('<dt>{0:s}</dt>', _('Insurance')),
        '<dd><small>{monthlyPeriods:s} x </small>{insurance:s} = {monthlyTotalInsurance:s}</dd>',
        $.format('<dt class="no-border">{0:s}</dt>', _('Total')),
        '<dd class="no-border"><small>{monthlyPeriods:s} x </small>{monthlyTotalPayment:s} = {monthlyGrandTotal:s}</dd>',
    '</dl>'
]);
$.tpl('summary.yearlyPayments', [
    $.format('<h2>{0:s}</h2>', _('Yearly schedule')),
    '<dl class="ui-widget-content ui-summary">',
        $.format('<dt>{0:s}</dt>', _('Mortgage')),
        '<dd><small>{yearlyPeriods:s} x </small>{yearlyPayment:s} = {yearlyTotal:s}</dd>',
        $.format('<dt>{0:s}</dt>', _('Taxes')),
        '<dd><small>{yearlyPeriods:s} x </small>{yearlyPaymentTax:s} = {yearlyTotalTax:s}</dd>',
        $.format('<dt>{0:s}</dt>', _('Insurance')),
        '<dd><small>{yearlyPeriods:s} x </small>{insurance:s} = {yearlyTotalInsurance:s}</dd>',
        $.format('<dt class="no-border">{0:s}</dt>', _('Total')),
        '<dd class="no-border"><small>{yearlyPeriods:s} x </small>{yearlyTotalPayment:s} = {yearlyGrandTotal:s}</dd>',
    '</dl>'
]);
$.tpl('mcalc.print', [
'<a href="#" id="mcalc-print-summary" class="ui-button ui-state-default ui-corner-all">',
    $.format('<span class="ui-icon ui-icon-print"/> {0:s}', _('Print')),
'</a>'
]);
$.ui.mcalc.component({
    name: 'summary',
    lazy: true,
    defaults: { 
        summary: true,
        summaryPrint: true
    },
    tpl: '<div id="tab-summary" class="ui-summary ui-corner-all" />',
    events: [
        {type: 'ready', callback: function(e, ui){
            ui._component('tabs')
                .append(this).tabs('add', '#tab-summary', _('Summary'));

        }},
        {type: 'refresh', callback: function(e, ui){
            // infos
            var subtotal = ui._component('subtotal').val();
            $(this).empty();
            if (ui.options.summaryPrint) {
                ui._component('tabs').find('#tab-summary').prepend($.tpl('mcalc.print')
                    .bind('click', function(){
                        $(this).hide();
                        ui._component('summary').jqprint();
                        $(this).show();
                    }));
            }

            var term = $.format('{0:d} months', ui.data.term * 12);
            
            if (ui.data.amortschedule == 'annual') {
                term = $.format('{0:d} years', ui.data.term);
            }
            
            $.tpl('summary.informations', {
                principal:   $.format(ui.options.currencyFormat, ui.data.principal),
                term:        term,
                interest:    ui.data.interest,
                subtotal:    subtotal,
                propretyTax: ui.data.propretyTax
              }).appendTo(this);

            
            $.tpl('summary.yearlyPayments', {
                yearlyPeriods: ui.data.annual.periods,
                yearlyPayment: $.format(ui.options.currencyFormat, ui.data.subtotal),
                yearlyTotal: $.format(ui.options.currencyFormat, ui.data.subtotal * ui.data.annual.periods),
                yearlyPaymentTax: $.format(ui.options.currencyFormat, ui.data.subtotal - ui.data.subtotal - ui.data.annual.insurance),
                yearlyTotalTax: $.format(ui.options.currencyFormat, (ui.data.total - ui.data.subtotal - ui.data.annual.insurance) * ui.data.annual.periods),
                insurance:  $.format(ui.options.currencyFormat, ui.data.annual.insurance),
                yearlyTotalInsurance: $.format(ui.options.currencyFormat, ui.data.annual.insurance * ui.data.annual.periods),
                yearlyTotalPayment: $.format(ui.options.currencyFormat, ui.data.total),
                yearlyGrandTotal: $.format(ui.options.currencyFormat, (ui.data.total * ui.data.annual.periods) + (ui.data.annual.insurance * ui.data.annual.periods))
            }).appendTo(this);

           $.tpl('summary.monthlyPayments', {
                monthlyPeriods: ui.data.monthly.periods,
                monthlyPayment: $.format(ui.options.currencyFormat, ui.data.subtotal),
                monthlyTotal: $.format(ui.options.currencyFormat, ui.data.subtotal * ui.data.monthly.periods),
                monthlyPaymentTax: $.format(ui.options.currencyFormat, ui.data.total - ui.data.Subtotal - ui.data.monthly.insurance),
                monthlyTotalTax: $.format(ui.options.currencyFormat, (ui.data.total - ui.data.subtotal - ui.data.monthly.insurance) * ui.data.monthly.periods),
                insurance:  $.format(ui.options.currencyFormat, ui.data.monthly.insurance),
                monthlyTotalInsurance: $.format(ui.options.currencyFormat, ui.data.monthly.insurance * ui.data.monthly.periods),
                monthlyTotalPayment: $.format(ui.options.currencyFormat, ui.data.total),
                monthlyGrandTotal: $.format(ui.options.currencyFormat, (ui.data.total * ui.data.monthly.periods) + (ui.data.monthly.insurance * ui.data.monthly.periods))
           }).appendTo(this);
           
        }}
    ]
});

})(jQuery);
