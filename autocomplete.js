var all = [];

var quantidadeDeMercadosConsultados = 10;

var currencyToConvert = 'BRL';

function BitCoin(ask, last, volume_percent, currency_name, bid){
    this.ask = ask;
    this.last = last;
    this.volume_percent = volume_percent;
    this.currency_name = currency_name;
    this.bid = bid;
    this.factor = 0;

    this.convertToCurrency = function(){
        var precision = 6;
        this.ask = (this.ask * this.factor).toPrecision(precision);
        this.last = (this.last * this.factor).toPrecision(precision);
        this.bid = (this.bid * this.factor).toPrecision(precision);
    }
}

function map(currency){

    var factor = 1;
    var fromCurrency = '';

    for(var i in currency.results){
        var currency = currency.results[i];
        fromCurrency = currency.fr;
        factor = currency.val;
    }

    var completeCoin;

    all.forEach(function(coin){
        if(coin.currency_name === fromCurrency){
            coin.factor = factor;
            completeCoin = coin;
        }
    });

    return completeCoin;
};

(function (global, $, undefined) {

    function getCurrency(currency) {
        var promise = $.ajax({
            url: 'http://www.freecurrencyconverterapi.com/api/convert?q='+currency+'-'+currencyToConvert,
            dataType: 'jsonp'
        }).promise();

        return Rx.Observable.fromPromise(promise);
    }

    function bitcoinCurrency(){
        var promise = $.ajax({
            url: 'https://api.bitcoinaverage.com/ticker/global/all',
            dataType: 'json'
        }).promise();

        return Rx.Observable.fromPromise(promise);
    }

    function main() {
        var $bitcoin_first = $('#bitcoin-first');
        var $bitcoin_second = $('#bitcoin-second');
        var $progress = $('#progress');

        var teste = Rx.Observable.interval(15000).startWith(1).flatMap(function(){
            $bitcoin_first.empty();
            $bitcoin_second.empty();
			getOrInitializeQuantity();
            $('#currencies-dropdown').empty();
            $('#progress-container').fadeIn(500);
            $('#progress').prop('style').width = '0%';
            return bitcoinCurrency();
        }).flatMap(function(currencies){
            delete(currencies['timestamp']);

            var currenciesToSort = [];

            for(var objectKey in currencies){
				var currency = currencies[objectKey];
                var coin = new BitCoin(currency.ask, currency.last, currency.volume_percent, objectKey, currency.bid);
                currenciesToSort.push(coin);
            }

            var sortedPiece = currenciesToSort.sort(function(first, second){
                return second.volume_percent - first.volume_percent;
            }).slice(0, quantidadeDeMercadosConsultados);

            all = sortedPiece;

            var selectedCurrency = [];

            all.forEach(function(coin){
                selectedCurrency.push(getCurrency(coin.currency_name));
            });

            return Rx.Observable.fromArray(selectedCurrency);
        }).concatAll();
		
		function getOrInitializeQuantity(){
			quantidade = $('#quantity').val();
            quantidadeDeMercadosConsultados = quantidade <= 0 ? 10 : quantidade;
			$('#quantity').val(quantidadeDeMercadosConsultados);
		}
		
	    function populateColumn(value){
	        var ask =  '<span class="badge">' + value.ask + ' asked</span>';
	        var last =  '<span class="badge">' + value.last + ' last</span>';
	        var volume =  '<span class="badge">' + value.volume_percent + ' % volume</span>';
	        var bid = '<a href="#">'+ currencyToConvert+' - ' + value.bid + ' (' +value.currency_name +')</a>';

	        $('<li class="list-group-item">' + ask + volume + last + bid + '</li>').appendTo(currentColumn());
	        updateProgressBar();
	    }
	
		function currentColumn(){
	        var limitSizePerColumn = quantidadeDeMercadosConsultados / 2;
	        return $bitcoin_first.children().length >= limitSizePerColumn ? $bitcoin_second : $bitcoin_first;
		}
	
	    function updateProgressBar(){
	        var completed = $bitcoin_first.children().length + $bitcoin_second.children().length;

	        var percentage = ((completed * 100) / quantidadeDeMercadosConsultados).toPrecision(3);

	        $('#progress').prop('style').width = percentage+'%';

	        if(percentage == 100) $('#progress-container').fadeOut(300);
	    }

	    function populateCurrencies(coin){
	        var element = $('<li><a href="#">'+coin.currency_name+'</a></li>');

	        element.appendTo($('#currencies-dropdown'));

	        element.click(function(){
	            currencyToConvert = $(this).text();
	        });
	    }
		
        teste.subscribe(
            function(currency){
                var coin = map(currency);
                populateCurrencies(coin);
                coin.convertToCurrency();
                populateColumn(coin);
            },
            function(error){
                $bitcoin_first.empty();
                $bitcoin_second.empty();
            });
    }

    main();

}(window, jQuery));