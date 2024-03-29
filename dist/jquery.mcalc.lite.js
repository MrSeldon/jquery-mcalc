/*
  jQuery mcalc - 0.2.0

  (c) Maxime Haineault <haineault@gmail.com> 
  http://haineault.com

  License: Not available yet.

 * */

(function($){
// i18n
function _(str, args) { return $.i18n('mcalc', str, args); }

$.extend($.strConversion, {
    C: function(input, args){ 
        var i = parseFloat(input, 10).toFixed(2); 
        i = (i == "NaN") ? "0.00" : i; 
        return i.replace(/(\d+)(\d{3})\.?(\d+)?/, '$1,$2.$3');
    }
});

$.widget('ui.mcalc', {
    data: {},
    refresh: function() {
        this._trigger('refresh');
    },
    _ui: {},
    _init: function() {
        var ui = this;
        
        this._log('mcalc:initialing: %o (options: %o, ui: %o)', this.element, this.options, this);

        for (var x in $.ui.mcalc.components) {
            if ($.ui.mcalc.components[x]) {
                var component = $.ui.mcalc.components[x];
                if (component.defaults) {
                    ui.options = $.extend(true, component.defaults, ui.options);
                }
                if ((component.lazy && ui.options[component.name]) || !component.lazy) {
                    ui._createComponent(component);
                }
            }
        }
        $(ui.element).width(ui.options.width).addClass('ui-mcalc ui-widget');
        ui._trigger('ready');
        ui._trigger('refresh');
    },

    _help: function() {
        if (this.options.showFieldHelp) {
            this._component('formpane').find('.ui-help').remove();
            if (arguments[0] !== false) {
                $.tpl('mcalc.help', {message: arguments[0]})
                    .appendTo(this._component('formpane')).fadeIn();
            }
        }
    },

    _recalc: function() {
        // fix highlight effect end color
        var bgcolor = this._component('tabs').css('backgroundColor');
        this._component('subtotal').css('backgroundColor', bgcolor);
        this._component('total').css('backgroundColor', bgcolor);

        var p = parseFloat(this._component('principal').val(), 10);
        var i = parseFloat(this._component('interest').val(), 10);
        var y = parseInt(this._component('term').val(), 10);
        var t = parseFloat(this._component('ptaxes').val(), 10);
        var s = parseFloat(this._component('insurance').val(), 10);
        this.data = {
            principal:          p,
            cashdown:           this._component('cashdown').val(),
            cashdownType:       this.options.cashdownType,
            term:               this._component('term').val(),
            pmi:                this._component('pmi').val(),
            interest:           this._component('interest').val(),
            amortschedule:      this._component('amortschedule').val(),
            yearlyInterest:     i / 100,
            monthlyInterest:    i / 100 / 12,
            yearlyPeriods:      y,
            monthlyPeriods:     y * 12,
            propretyTax:        t,
            yearlyPropretyTax:  t/100,
            monthlyPropertyTax: t/100,
            yearlyInsurance:    p * s / 100,
            monthlyInsurance:   p * s / 100 / 12
        };
        this._log('mcalc.recalc: %o', this.data);
        this._updateTotals(this.calc(this.data));
    },

    calc: function(){
        return $.ui.mcalc.formulas[this.options.formula]['calc']
            .apply(document, [this.data])
    },

    _log: function() {
        if ((typeof(console) == 'undefined' || typeof(console.log) == 'undefined') && this.options.debug) {
            console.log.apply(document, arguments);
        }
    },

    _trigger: function(e, component) {
        this._log('mcalc.event: %s', e);
        if (e == 'refresh' && !component) { 
            this.element.trigger('refresh'); 
        }
        for (var x in this._components) {
            var c = this._components[x];
            if ((!component 
                 || (component 
                     && (component == c.name 
                     || $.inArray(component, c.name) > -1))) 
                && c.events) {
                    // Component will receive the event only if they either are 
                    // not "lazy" OR are "lazy" AND enabled in the options 
                    // (this.options.componentname is true)
                    if ((c.lazy && this.options[c.name]) || !c.lazy) {
                        for (var y in c.events) {
                            var ev = c.events[y];
                            if (ev.type == e) {
                                var el = ev.selector && this._component(c.name).find(ev.selector) || this._component(c.name);
                                this._log(' - %s: %o', e, c);
                                ev.callback.apply(el, [$.Event(e), this]);
                            }
                        }
                    }
            }
        }
    },

    _components: [],
    _createComponent: function(c, args) {
        var $elf = this;
        var ns = arguments[0].name + '.component';
        var callback = function(event) {
            e.callback.apply(this, [event, $elf]);
        };
        this._components[ns] = arguments[0];
        if ($.isFunction(arguments[0].tpl)) {
            $.tpl(ns, arguments[0].tpl(this));
        }
        else {
            $.tpl(ns, arguments[0].tpl);
        }
        this._ui[ns] = $.tpl(ns);
        if (c.init) { c.init.apply(this._ui[ns], [this]); }
        if (c.val)  { this._ui[ns].val = c.val; }
        if (c.help) { this._ui[ns].data('help', c.help); }
        if (c.events) {
            for (var k in c.events) {
                var e = c.events[k];
                var b = c.live && 'live' || 'bind';
                if (e.selector) {
                    this._component(arguments[0].name).find(e.selector)[b](e.type +'.component', callback);
                }
                else {
                    this._component(arguments[0].name)[b](e.type +'.component', callback);
                }
            }
        }
        if (c.help) {
            var fields = this._component(arguments[0].name).find('input, select, textarea');

            if (fields.length === 0) {
                this._component(arguments[0].name)
                    .bind('mouseover',  function(){ $elf._help(c.help); })
                    .bind('mouseleave', function(){ $elf._help(false);  });
            }
            else {
                fields.bind('focus', function(){ $elf._help(c.help); })
                      .bind('blur',  function(){ $elf._help(false);  });
            }

        }
        return this._ui[ns];
    },
    _component: function() {
        var ns = arguments[0] + '.component';
        return this._ui[ns] || jQuery();
    },
    _updateTotals: function(total, subtotal) {
        var effectArgs = [this.options.fieldUpdatedEffect, this.options.fieldUpdatedEffectOptions, this.options.fieldUpdatedEffectDuration, 
            function(){
                $(this).css('backgroundColor', 'transparent');
                $(this).css('backgroundColor', 'transparent');
            }
        ];

        $.fn.effect.apply(this._component('subtotal'), effectArgs) 
            .find('b').text($.format(this.options.currencyFormat, subtotal));
        
        $.fn.effect.apply(this._component('total'), effectArgs)
            .find('b').text($.format(this.options.currencyFormat, total));
    },
    _smartResize: function(pr, size, axis, callback){
        if (size instanceof jQuery) {
            var el   = size;
            size = [size.width(), size.height()];
        }

        if (axis == 'width') {
            var pw = pr.width();
            var cw = size[0];
            var ns = size;

            if (pw < cw) {
                var sides = ['left', 'right'];
                var dif = 0;
                for (var x in sides) {
                    //dif = dif + parseInt(pr.css('margin-'+  sides[x]).slice(0, -2));
                    //dif = dif + parseInt(pr.css('padding-'+ sides[x]).slice(0, -2));
                }
                ns[0] = cw - (dif + (cw - pw));
                ns[1] = Math.round(ns[0]/cw * size[1]);

                if (callback) {
                    callback.apply(this, ns);
                }
                else if (el) {
                    $(el).width(size[0]);
                    $(el).height(size[1]);
                }
                else {
                    return ns;
                }

            }
        }
    }
});

$.ui.mcalc.defaults = {
    debug:       false,
    formula:     'can',
    form:        ['principal', 'cashdown', 'interest', 'term', 'amortschedule', 'subtotal', 'insurance', 'ptaxes', 'pmi', 'total'],
    principal:   300000,        // $
    cashdown:    '10.00',       // %
    cashdownType: 'percent',    // raw || percent
    interest:    '5.50',        // %
    term:        30,            // years
    termValues:  [5, 10, 15, 20, 25, 30],
    ptaxes:      '1.50',        // %
    insurance:   '0.50',        // %
    pmi:         '80.00',       // $
    pmiThershold: 20,           // %
    currencyFormat: _('${0:C}'),
    showFieldHelp: true,
    fieldUpdatedEffect: 'highlight',
    fieldUpdatedEffectOptions: {},
    fieldUpdatedEffectDuration: 1000,
    width: 600,
    tabs:  true // mandatory
};

$.ui.mcalc.getVal = function(){
    if (arguments.length > 0){
        return $(this).find('input').val.apply(this, arguments);
    }
    return $(this).find('input').val();
};

$.ui.mcalc.inputReadyRefreshObserver = function(e, ui){
    $(this).find('input').delayedObserver(function(e) {
        ui._trigger('refresh');
    }, 1.0);
};

$.ui.mcalc.formulas = {};
$.ui.mcalc.formula  = function(f) { $.ui.mcalc.formulas[f.name] = f; };

$.ui.mcalc.components = {};
$.ui.mcalc.component  = function(c) { $.ui.mcalc.components[c.name] = c; };

$.ui.mcalc.component({
    name: 'tabs',
    tpl: [
    '<div id="mcal-tabs">',
        '<ul>',
            $.format('<li><a href="#tab-calculator">{0:s}</a></li>', _('Calculator')),
        '</ul>',
        '<div id="tab-calculator" class="ui-helper-clearfix"></div>',
    '</div>'],
    init: function(ui) {
        var $elf = ui;
        ui._getActiveTab = function() {
            return ui._component('tabs').find('.ui-state-active a').attr('href').replace('#tab-', '');
        };
        ui._getActiveTabId = function() {
            return ui._component('tabs').tabs('option', 'selected');
        };
        ui._getTabId = function(slug){
            return ui._component('tabs').find('li a').index(ui._component('tabs').find('li a[href=#tab-]'+ slug));
        };
    },
    events: [
        {type: 'ready', callback: function(e, ui){
            var $elf = ui;
            $(this).appendTo(ui.element)
                .find('#tab-calculator')
                    .append(ui._component('form'))
                    .append(ui._component('formpane'))
                .end() 
                .tabs()
                .bind('tabsshow', function(e, ui){
                    $elf._trigger('refresh');
                });
        }}
    ]
});

$.ui.mcalc.defaults.principalKeynav = {
    type: 'integer',
    max_length: 7,
    max: 9999999
};

$.ui.mcalc.component({
    name: 'principal',
    tpl:  $.format('<li class="ui-helper-clearfix"><label>{0:s}</label><input id="ui-mcalc-principal" type="text" maxlength="9" /> $</li>', _('Principal')),
    help: _('The amount lent, or the value of the assets lent, is called the principal. This principal value is held by the borrower on credit.'),
    val:  function(){ 
        var $elf = $(this);
        if (arguments.length > 0){
            $elf.find('input').val(arguments[0]);
            return $elf;
        }
        return parseFloat($elf.find('input').val(), 10);
    },
    init: function(ui) {
        $(this).find('input').val(ui.options.principal).keynav(ui.options.principalKeynav);
    },
    events: [
        {type: 'ready', callback: $.ui.mcalc.inputReadyRefreshObserver}
    ]
});


$.ui.mcalc.defaults.fixedKeynav = {
    type: 'fixed',
    max_length: 5,
    max_digits: 2,
    max: 99
};

$.ui.mcalc.component({
    name: 'cashdown',
    tpl:  function(ui){
        return $.format('<li class="ui-helper-clearfix"><label>{0:s}</label><input id="ui-mcalc-cashdown" type="text" maxlength="6" /> {1:s} <small></small></li>', 
                        _('Down payment'), (ui.options.cashdownType == 'raw' && '$' || '%'))
    },
    val:  function(){ 
        var $elf = $(this);
        if (arguments.length > 0){
            $elf.find('input').val(arguments[0]);
            return $elf;
        }
        return parseFloat($elf.find('input').val(), 10);
    },
    init: function(ui) {
        $(this).find('input')
               .width(35)
               .val(ui.options.cashdown)
        if (ui.options.cashdownType == 'percent') {
            $(this).find('input').keynav($.ui.mcalc.defaults.fixedKeynav);
        }
    },
    events: [
        {type: 'ready',   callback: $.ui.mcalc.inputReadyRefreshObserver},
        {type: 'refresh', callback: function(e, ui) {
            if (ui.options.cashdownType == 'raw') {
                var cd = $.format('{0:s}%',  ((ui._component('cashdown').val() / ui._component('principal').val()) * 100).toFixed(2));
            }
            else {
                var cd = $.format(ui.options.currencyFormat, ui._component('principal').val() * ui._component('cashdown').val()/100);
            }
            $(this).find('small').text(' ('+ cd +')');
        }}
    ]
});

$.ui.mcalc.component({
    name: 'interest',
    tpl:  $.format('<li class="ui-helper-clearfix"><label>{0:s}</label><input id="ui-mcalc-interest" type="text" />&nbsp;%</li>', _('Interest')),
    help: _('The interest is a compensation to the lender for forgoing other useful investments that could have been made with the loaned asset.'),
    val:  function(){
        if (arguments.length > 0){
            return $(this).find('input').val(arguments[0]);
        }
        return $(this).find('input').val();
    },
    init: function(ui){
        $(this).find('input')
               .width(35)
               .val(ui.options.interest)
               .keynav($.ui.mcalc.defaults.fixedKeynav);
    },
    events: [
        {type: 'ready', callback: $.ui.mcalc.inputReadyRefreshObserver}
    ]
});

$.ui.mcalc.component({
    name: 'term',
    tpl:  [
        '<li class="ui-helper-clearfix">',
            $.format('<label>{0:s}</label>', _('Term')),
            '<select id="ui-mcalc-term"></select>&nbsp;',
            $.format('<small>({0:s})</small>', _('years')),
        '</li>'
    ],
    val:  function(){
        var $elf = $(this);
        if (arguments.length > 0){
            $elf.find('select').val(parseInt(arguments[0], 10));
            return $elf;
        }
        return parseInt($elf.find('select').val(), 10);
    },
    init: function(ui) {
        var tpl = [];
        for (var x in $.ui.mcalc.defaults.termValues) {
            tpl.push($.format('<option value="{0:s}">{0:s}</option>', $.ui.mcalc.defaults.termValues[x]));
        }
        $(this).find('select')
            .append(tpl.join('')).val(ui.options.term);
    },
    events: [
        {type: 'change', selector: '> select', callback: function(e, ui){
            ui._trigger('refresh');
        }}
    ]
});

$.ui.mcalc.component({
    name: 'ptaxes',
    tpl:  $.format('<li class="ui-helper-clearfix"><label>{0:s}</label><input id="ui-mcalc-ptaxes" type="text" /> % <small></small></li>', _('Property taxes')),
    help: _('The Shift and Alt keys act as a modifiers when changing a value with the arrows or the mousewheel.'),
    val:  function(){
        if (arguments.length > 0){
            return $(this).find('input').val.apply(this, arguments);
        }
        return $(this).find('input').val();
    },
    init:  function(ui){
        $(this).find('input')
               .width(35)
               .val(ui.options.ptaxes)
               .keynav($.ui.mcalc.defaults.fixedKeynav);
    },
    events: [
        {type: 'ready', callback: $.ui.mcalc.inputReadyRefreshObserver},
        {type: 'refresh', callback: function(e, ui) {
            var cd = $.format(ui.options.currencyFormat, ui._component('principal').val() * ui._component('ptaxes').val()/100);
            $(this).find('small').text(' ('+ cd +')');
        }}
    ]
});

$.ui.mcalc.component({
    name: 'insurance',
    help: _('You can use the up/down arrows or the mousewheel to change the values of the fields.'),
    tpl:  $.format('<li class="ui-helper-clearfix"><label>{0:}</label><input id="ui-mcalc-insurance" type="text" /> % <small></small></li>', _('Insurance')),
    val:  function(){
        if (arguments.length > 0){
            return $(this).find('input').val.apply(this, arguments);
        }
        return $(this).find('input').val();
    },
    init:  function(ui){
        $(this).find('input')
               .width(35)
               .val(ui.options.insurance)
               .keynav($.ui.mcalc.defaults.fixedKeynav);
    },
    events: [
        {type: 'ready', callback: $.ui.mcalc.inputReadyRefreshObserver},
        {type: 'refresh', callback: function(e, ui) {
            var cd = $.format(ui.options.currencyFormat, ui._component('principal').val() * ui._component('insurance').val()/100);
            $(this).find('small').text(' ('+ cd +')');
        }}
    ]
});

$.ui.mcalc.component({
    name: 'pmi',
    tpl:  $.format('<li class="ui-helper-clearfix"><label>{0:}</label><input id="ui-mcalc-pmi" type="text" /> $</li>', _('PMI')),
    help: 'If the down payment is less than 20% of the principal mortgage amount, it\'s likely that PMI will be required. PMI is an additional monthly insurance cost added directly to the mortgage payment.<br><br>Adding fields for these two values is key to projecting monthly mortgage costs.',
    val:  function(){
        if (arguments.length > 0){
            return $(this).find('input').val.apply(this, arguments);
        }
        return parseFloat($(this).find('input').val(), 10);
    },
    init:  function(ui){
        $(this).find('input')
               .width(35)
               .val(ui.options.pmi)
               .keynav($.ui.mcalc.defaults.fixedKeynav);
    },
    events: [
        {type: 'ready', callback: $.ui.mcalc.inputReadyRefreshObserver},
        {type: 'refresh', callback: function(e, ui) {
            if (ui._component('cashdown').val() < ui.options.pmiThershold) {
                ui._component('pmi').slideDown().val(ui.options.pmi);
                ui.data.pmi = ui.options.pmi;
            }
            else {
                ui._component('pmi').slideUp().val(0);
                ui.data.pmi = 0;
            }
        }}
    ]
});

$.ui.mcalc.component({
    name: 'amortschedule',
    tpl:  [
        '<li class="ui-helper-clearfix">',
            $.format('<label>{0:s}</label> ', _('Schedule')),
            $.format('<label style="display:inline;float:none;"><input type="radio" name="ui-amortschedule" value="monthly" checked> {0:s}</label>', _('Monthly')),
            $.format('<label style="display:inline;float:none;"><input type="radio" name="ui-amortschedule" value="yearly"> {0:s}</label>', _('Yearly')),
        '</li>'
    ],
    val:  function(){
        if (arguments.length > 0){
            return $(this).find('input').val.apply(this, arguments);
        }
        return $(this).find('input:checked').val();
    },
    events: [
        {type: 'change', selector: 'input', callback: function(e, ui){
            ui._trigger('refresh');
        }}
    ]
});

$.ui.mcalc.component({
    name: 'subtotal',
    tpl:  $.format('<li class="ui-mcalc-subtotal ui-helper-clearfix"><label>{0:s}</label><b>0.00</b></li>', _('Sub total')),
    val: function() {
        if (arguments.length === 0) {
            return parseFloat($(this).find('b').text().replace('$', ''), 10);
        }
    }
});

$.ui.mcalc.component({
    name: 'total',
    tpl:  $.format('<li class="ui-mcalc-total ui-helper-clearfix"><label>{0:s}</label><b>0.00</b></li>', _('Total')),
    val: function() {
        if (arguments.length === 0) {
            return parseFloat($(this).find('b').text().replace('$', ''), 10);
        }
    }
});

$.tpl('mcalc.help', '<div class="ui-help ui-state-highlight ui-corner-all ui-helper-hidden"><span class="ui-icon ui-icon-info"/><p>{message:s}</p></div>');
$.ui.mcalc.component({ name: 'formpane', tpl: '<div class="ui-formpane"></div>' });

$.ui.mcalc.component({
    name: 'form',
    tpl:  '<ul class="ui-form ui-mcalc-form"></ul>',
    events: [
        {type: 'ready', callback: function(e, ui){
            for (var x in ui.options.form) {
                $(this).append(ui._component(ui.options.form[x]));
            }
        }},
        {type: 'refresh', callback: function(e, ui) {
            ui._recalc();
        }}
    ]
});



$.ui.mcalc.formula({
    // Calculate monthly payments (Canadian formula)
    name: 'can',
    calc: function(d) { 
        var p = (d.cashdownType == 'raw') && d.principal - d.cashdown || d.principal - (d.principal * d.cashdown/100);
        var c = function(p, freq, interest, term) {
            var ir = Math.pow((1 + (Math.pow((1 + (interest / 2)), 2) - 1)), (1 / freq)) -1;
            var q  = Math.pow(1 + ir, parseFloat(freq * term));
            return Math.round(((p * q) / (q - 1)) * ir * 100) / 100;
        };

        d.monthlySubtotal = c(p, 12, d.yearlyInterest, d.term);
        d.yearlySubtotal  = c(p, 1, d.yearlyInterest, d.term);

        d.monthlyTotal = parseFloat(d.monthlySubtotal + (d.monthlyPropertyTax * p) / 12 + d.monthlyInsurance + d.pmi, 10);

        d.yearlyTotal = parseFloat(d.yearlySubtotal + (d.yearlyPropretyTax * p) + d.yearlyInsurance + (d.pmi * 12), 10);

        return (d.amortschedule == 'yearly')
            ? [d.yearlyTotal,  d.yearlySubtotal]
            : [d.monthlyTotal, d.monthlySubtotal];
    }
});


$.ui.mcalc.formula({
    // Calculate monthly payments (United States formula)
    name: 'usa',

    calc: function() { 
        var d = this.data;
        var p = (d.cashdownType == 'raw') && d.principal - d.cashdown || d.principal - (d.principal * d.cashdown/100);

        d.yearlySubtotal = parseFloat(
            (p * Math.pow(1 + d.yearlyInterest, d.yearlyPeriods) * d.yearlyInterest) / (Math.pow(1 + d.yearlyInterest, d.yearlyPeriods) -1)
        , 10);

        d.yearlyTotal = parseFloat(
            d.yearlySubtotal 
            + (d.yearlyPropretyTax * p) 
            + d.yearlyInsurance 
            + (d.pmi * 12)
        , 10);

        d.monthlySubtotal = parseFloat(
            (p * Math.pow(1 + d.monthlyInterest, d.monthlyPeriods) * d.monthlyInterest) / (Math.pow(1 + d.monthlyInterest, d.monthlyPeriods) -1)
        , 10);

        d.monthlyTotal = parseFloat(
            d.monthlySubtotal 
            + (d.monthlyPropertyTax * p) / 12
            + d.monthlyInsurance + d.pmi
        , 10);

        return (d.amortschedule == 'yearly')
            ? [d.yearlyTotal,  d.yearlySubtotal]
            : [d.monthlyTotal, d.monthlySubtotal]
    }
});

})(jQuery);
/*
  jQuery mcalc.about - 0.2.0

  (c) Maxime Haineault <haineault@gmail.com> 
  http://haineault.com

  License: Not available yet.
*/

(function($){
// i18n
function _(str, args) { return $.i18n('mcalc', str, args); }

$.tpl('amortization.row', '<tr><th>{period:s}</th><td>{interest:C}</td><td>{principal:C}</td><td>{balance:C}</td></tr>');

$.ui.mcalc.amortableCalc = function() { 
    var p = this.data.principal;
    var b = p; // Balance
    var i = this.data.yearlyInterest;
    var y = this.data.yearlyPeriods;

    if (this.data.amortschedule == 'monthly') {
        i = this.data.monthlyInterest;
        y = this.data.monthlyPeriods;

        var periodEnd   = parseInt(this._component('amortoolbar').find('span').text(), 10) * 12;
        var periodStart = periodEnd - 11;
    }

    var payment = (i * b * Math.pow(1 + i, y)) / (Math.pow(1 + i, y) - 1);
    var table = [];

    for (var x=1; x <= y; x++) {
        var interestPaid = (b * i);
        var principalPaid = (payment - interestPaid);
        var row = {
            period:    x,
            balance:   b.toFixed(2),
            principal: principalPaid.toFixed(2),
            payment:   payment.toFixed(2),
            interest:  interestPaid.toFixed(2)
        };
        table.push(row);
        b = (b - principalPaid);
        if (!periodStart || (x >= periodStart && x <= periodEnd) || this._amortableShowAll) {
            $.tpl('amortization.row', row)
                .appendTo(this._component('amortable').find('tbody'));
        }
    }
    this._amortabledata = table;
    this._component('amortable')
        .data('amortable', table)
        .find('tbody tr:odd').addClass('odd');
};


$.ui.mcalc.component({
    name: 'amortable',
    lazy: true,
    defaults: {
        amortable: true,
        amortableCalc: $.ui.mcalc.amortableCalc
    },
    tpl: [
    '<div id="tab-amortization" class="ui-helper-clearfix">',
        $.format('<table class="ui-amortable" cellpadding="0" cellspacing="0" summary="">', _('Amortization table')),
            '<thead><tr>',
                $.format('<th class="ui-state-default" style="width:50px;">{0:s}</th>', _('Period')),
                $.format('<th class="ui-state-default" style="width:100px;">{0:s}</th>', _('Interest')),
                $.format('<th class="ui-state-default" style="width:100px;">{0:s}</th>', _('Principal')),
                $.format('<th class="ui-state-default">{0:s}</th>', _('Balance')),
            '</tr></thead>',
            '<tbody class="ui-widget-content"></tbody>',
        '</table>',
    '</div>'
    ],
    init: function(ui) {
        ui._amortable = function() {
            ui._component('amortable').find('tbody').empty();
            ui.options.amortableCalc.apply(this);
        };
    },
    events: [
        {type: 'ready', callback: function(e, ui) {
            ui._component('tabs')
                .append(this).tabs('add', '#tab-amortization', _('Amortization'));
        }},
        {type: 'recalc', callback: function(e, ui) {
            if (ui.data.amortschedule == 'yearly') {
                ui._component('amortoolbar').hide();
            }
            else {
                ui._component('amortoolbar').show();
            }
        }},
        {type: 'refresh', callback: function(e, ui) {
            if (ui._getActiveTab() == 'amortization') { // redraw only if visible
                ui._amortable();
            }
        }}
    ]
});

$.ui.mcalc.component({
    name: 'amortoolbar',
    tpl: [
        '<div class="ui-amortoolbar ui-helper-clearfix">',
            '<div class="ui-mcalc-slider"></div> ',
            $.format('<label>{0:s}:</label> <span>1</span> ', _('Year')),
            $.format('<label><input type="checkbox" class="ui-mcalc-amortable-all" /> {0:s}</label>', _('All')),
        '</div>'
    ],
    init: function(ui) {
        ui._amortableShowAll = false;
        ui._component('amortable').prepend(this);
        $(this).find('input').bind('change', function(e){
            ui._amortableShowAll = $(this).is(':checked');
            $('.ui-slider').slider('option', 'disabled', ui._amortableShowAll);
            ui._trigger('refresh');
        });
    },
    events: [
        {type: 'refresh', callback: function(e, ui) {
            ui._component('amortoolbar')[ui.data.amortschedule == 'monthly' && 'show' || 'hide']();
        }},
        {type: 'ready', callback: function(e, ui) {
            var $elf = ui; 
            $(this).find('.ui-mcalc-slider').slider({
                step:  3,
                slide: function(e, ui) {
                    $elf._component('amortoolbar').find('span').text(Math.round($elf._component('term').val()/100 * ui.value)||1);
                },
                change: function(e, ui) {
                    $elf._trigger('refresh');
                }
            });
        }}
    ]
});

})(jQuery);
/*
  jQuery mcalc.about - 0.2.0

  (c) Maxime Haineault <haineault@gmail.com> 
  http://haineault.com

  License: Not available yet.
*/

(function($){
// i18n
function _(str, args) { return $.i18n('mcalc', str, args); }
$.googleChart = function(chart) {
    this.url = 'http://chart.apis.google.com/chart';
    var o = [];
    for (var x in chart) {
        if (x == 'chdl') {
            o.push([x, escape(chart[x])].join('='));
        }
        else {
            o.push([x, chart[x]].join('='));
        }
    }
    return $.format('url({0:s}?{1:s})', this.url, o.join('&'));
};

$.ui.mcalc.simpleEncode = function(valueArray, maxValue){
    this.map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var chartData = ['s:'];
    for (var i = 0; i < valueArray.length; i++) {
        var currentValue = valueArray[i];
        if (!isNaN(currentValue) && currentValue >= 0) {
            chartData.push(this.map.charAt(Math.round((this.map.length-1) * currentValue / maxValue)));
        }
        else {
            chartData.push('_');
        }
    }
    return chartData.join('');
};

$.ui.mcalc.extendedEncode = function(val) {
    this.map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.';
    var numericVal = parseInt(val, 10);
    if(isNaN(numericVal)) {
        alert("Non-numeric value submitted");
        return "";
    } else if (numericVal < 0 || numericVal > this.map.length * this.map.length - 1) {
        alert("Value outside permitted range");
        return "";
    }
    var quotient = Math.floor(numericVal / this.map.length);
    var remainder = numericVal - this.map.length * quotient;
    return this.map.charAt(quotient) + this.map.charAt(remainder);
};


$.ui.mcalc.component({
    name: 'interestchart',
    help: _('Click on the chart to switch view mode.'),
    lazy: true,
    defaults: { 
        interestchart: true,
        interestchartSmartResize: true,
        interestChartType: ['p3', 'p'],
        interestChart: {
            chs:  '290x160',
            cht:  'p3',
            chco: 'F7AF3A,CC3300,1C94C4',
            chma: '10,0,0,20|80,20',
            chdl: $.format('{0:s}|{1:s}|{2:s}', _('Principal'), _('Interest'), _('Others')),
            chf:  'bg,s,eeeeee',
            chdlp: 'b'
        }
    },
    tpl: '<div class="ui-chart ui-corner-all"></div>',
    init: function(ui) {
        ui._interestChartType = ui.options.interestChart.cht || ui.options.interestChartType[0];
    },
    events: [
        {type: 'ready', callback: function(e, ui){
            $(this).prependTo(ui._component('formpane'));
            if ($.isArray(ui.options.interestChartType)) {
                $(this).css('cursor', 'pointer').bind('click', function(){
                    var index = $.inArray(ui._interestChartType, ui.options.interestChartType);
                    index = (index == -1 || index == ui.options.interestChartType.length - 1)? 0: index+1;
                    ui._interestChartType = ui.options.interestChartType[index];
                    ui._trigger('refresh', 'interestchart');
                    ui._trigger('refresh', 'permalink');
                });
            }
        }},
        {type: 'refresh', callback: function(e, ui){
            var subtotal = ui.data.yearlySubtotal;
            var total = ui.data.yearlyTotal;

            if (ui.data.amortschedule == 'monthly') {
                subtotal = ui.data.monthlySubtotal;
                total = ui.data.monthlyTotal;
            }

            var principal = Math.abs(Math.round((ui.data.principal / total) * 100));
            var interest  = Math.abs(Math.round(((subtotal - principal) / total) * 100));
            var other     = Math.abs(Math.round(((total - subtotal) / total) * 100));
            var size      = ui.options.interestChart.chs.split('x');
            
            // Sensible size adjustment (used mainly for widget vertion)
            if (ui._getActiveTab() == 'calculator') {
                var pr = ui._component('interestchart').parent().parent();
                size = $.map(ui.options.interestChart.chs.split('x'), 
                           function(i){ return parseInt(i, 10); });

                if (ui.options.interestchartSmartResize) {
                    ui._smartResize(pr, size, 'width', function(){
                        ui.options.interestChart.chs = $.makeArray(arguments).join('x');
                    });
                }
            }
            var chart = $.googleChart($.extend({}, ui.options.interestChart, {
                chd: $.format('t:{0:s},{1:s},{2:s}', principal, interest, other),
                cht: ''+ui._interestChartType // strange bug..
            }));

            ui._component('interestchart').css({
                backgroundImage: chart, 
                width:  parseInt(size[0], 10), 
                height: parseInt(size[1], 10)
            });
        }}
    ]
});


$.ui.mcalc.component({
    name: 'amortchart',
    lazy: true,
    defaults: { 
        amortchart: true,
        amortChart: {
            chs:  '270x160',
            cht:  'lc',
            chco: 'F7AF3A,CC3300',
            chma: '10,0,0,20|80,20',
            chdl: $.format('{0:s}|{1:s}', _('Principal'), _('Interest')),
            chxt: 'x,y',
            chg:  '20,50,1,5',
            chf:  'bg,s,eeeeee',
            chm:  'D,F7AF3A,0,0,2|D,CC3300,1,0,2',
            chdlp: 'b'
        },
        balanceChart: {
            cht:  'lc',
            chls: '2.0,0.0,0.0',
            chxt: 'x,y',
            chdl: _('Balance'),
            chs:  '288x160',
            chg:  '20,50,1,5',
            chf:  'bg,s,eeeeee',
            chma: '10,0,0,20|80,20',
            chdlp: 'b'
        }
    },
    tpl: [
    '<div class="ui-amortcharts">',
        '<div class="ui-amortcharts-amort ui-chart"></div>',
        '<div class="ui-amortcharts-balance ui-chart"></div>',
        '<div style="clear:both;"></div>',
    '</div>'
    ],
    init: function(ui) {

        ui._refreshAmortizationChart = function() {
            var o = {i:[], p:[]};
            var s = ui.options.amortChart.chs.split('x');
            var p = ui.data.principal;
            var term = ui.data.term;

            for (var x = 0; x < ui._amortabledata.length;x++) {
                var r = ui._amortabledata[x];
                if (ui.data.amortschedule == 'monthly') {
                    o.p.push(Math.round((r.principal * 12 / p) * 100 * 10));
                    o.i.push(Math.round((r.interest  * 12 / p) * 100 * 10));
                    x = x + 12;
                }
                else {
                    o.p.push(Math.round((r.principal / p) * 100 * 10));
                    o.i.push(Math.round((r.interest  / p) * 100 * 10));
                }
            }

            var xRange = $.map($.range(0, term, term/5), function(i){ return (new Date()).getFullYear() + i; }).join('|');
            var yRange = $.range(0, (Math.round(p/100000)*100000)+1, 100000).join('|');
            var chart  = $.googleChart($.extend(ui.options.amortChart, {
                chd:  $.format('t:{0:s}|{1:s}', o.p.join(','), o.i.join(',')),
                chxl: $.format('0:|{0:s}|1:|{1:s}', xRange, yRange)
            }));
            ui._component('amortchart')
                .find('.ui-amortcharts-amort').css({
                    backgroundImage: chart, 
                    width:  parseInt(s[0], 10), 
                    height: parseInt(s[1], 10)
                });
        };

        ui._refreshBalanceChart = function() {
            var o = [];
            var ui = this;
            var p = ui.data.principal;
            var term = ui.data.term;
            var xRange = $.map($.range(0, term, term/5), function(i){ return (new Date()).getFullYear() + i; }).join('|');
            var yRange = $.range(0, (Math.round(p/100000)*100000)+1, 100000).join('|');
            for (var x in ui._amortabledata) {
                var r = ui._amortabledata[x];
                o.push(Math.round((r.balance   / p) * 100));
            }
            var ch = $.googleChart($.extend(ui.options.balanceChart, {
                chd:  't:' + o.join(','),
                chxl: $.format('0:|{0:s}|1:|{1:s}', xRange, yRange)
            }));

            var s = ui.options.balanceChart.chs.split('x');
            ui._component('amortchart')
                .find('.ui-amortcharts-balance').css({
                    backgroundImage: ch, 
                    width:  parseInt(s[0], 10), 
                    height: parseInt(s[1], 10)});
        };
    },
    events: [
        {type: 'ready', callback: function(e, ui){
            $(this)
                //.css({width:100, height:100, background: '#c30'})
                .prependTo(ui._component('tabs').find('#tab-amortization'));
        }},
        {type: 'refresh', callback: function(e, ui){
            if (ui._getActiveTab() == 'amortization') {
                ui._refreshAmortizationChart();
                ui._refreshBalanceChart();
            }
        }}
    ]
});
})(jQuery);
