(function () {
    var files = [];
    var files_length = 0;
    var opts = {
        zoom: 5,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        center: new google.maps.LatLng(39, 138),
        styles: [{
            stylers: [
                { gamma: 0 },
                { lightness: 0 },
                { saturation: -60 },
                { inverse_lightness: false }
            ]
        }],
        mapTypeControlOptions: {
            mapTypeIds: [google.maps.MapTypeId.ROADMAP, '白地図'],
            style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
        }
    };

    var map = new google.maps.Map(document.getElementById("map"), opts);

    // GSI Map - Ortho
    function WhiteMapLyer() {

        WhiteMapLyer.prototype.tileSize = new google.maps.Size(256, 256);
        WhiteMapLyer.prototype.minZoom = 5;
        WhiteMapLyer.prototype.maxZoom = 14;
        WhiteMapLyer.prototype.name = '白地図(MIERUNE)';
        WhiteMapLyer.prototype.alt = '白地図(MIERUNE)';

        WhiteMapLyer.prototype.getTile = function (tileXY, zoom, ownerDocument) {
            var tileImage = ownerDocument.createElement('img');
//            var x = tileXY.x;
//            var y = Math.pow(2, (zoom-1)) - 1 - tileXY.y;
//            var z = zoom + 1;

//            var url = 'https://map.c.yimg.jp/b?r=1&x=' + x + '&y=' + y + '&z=' +z;
//            var url = 'https://cyberjapandata.gsi.go.jp/xyz/blank/' + zoom  + '/' + tileXY.x + '/' + tileXY.y + '.png';
            var url = 'https://tile.mierune.co.jp/mierune_mono/' + zoom  + '/' + tileXY.x + '/' + tileXY.y + '.png';

            tileImage.src = url;
            tileImage.style.width = this.tileSize.width + 'px';
            tileImage.style.height = this.tileSize.height + 'px';

            return tileImage;
        };
    }
    var whiteMapLyer = new WhiteMapLyer();
    map.mapTypes.set('白地図', whiteMapLyer);
//    map.setMapTypeId('白地図');





    var bounds = new google.maps.LatLngBounds();
    var routes = [];

    function parse_gpx(xml_string) {
        var route = [];

        var parser = new DOMParser();
        var xmldoc = parser.parseFromString(xml_string, "text/xml");

        $(xmldoc).find('trk>trkseg>trkpt').each(function (i, pt) {
            if (i % 2 !== 0) return;
            var $pt = $(pt);
            var latlon = new google.maps.LatLng($pt.attr('lat'), $pt.attr('lon'));
            route.push(latlon);
            bounds.extend(latlon);
        });

        var polylineOpts = {
            map: map,
            path: route,
            strokeColor: 'red',
            strokeOpacity: 0.7,
            strokeWeight: 2
        };
        var polyline = new google.maps.Polyline(polylineOpts);

        var distance = 0;
        var pathList = polyline.getPath();
        pathList.forEach(function (path, i) {
            if (i - 1 <= 0) return;
            distance += google.maps.geometry.spherical.computeDistanceBetween(path, pathList.getAt(i-1));
        });

        routes.push({
            title: xmldoc.querySelector('metadata>name') ? xmldoc.querySelector('metadata>name').textContent : 'new route',
            distance: distance,
            polyline: polyline
        });
    }


    var reader = new FileReader();
    function readFiles(files_array) {
        if (files_array.length > 0) {
            var file = files_array.shift();

            // プログレスバー、背景色の更新
            var progress = (files_length - files_array.length) / files_length;
            $('#progress').attr({ 'value': progress * 100 });
            $('.popup').css({ 'opacity': 0.7 - progress });

            reader.onloadend = function (loadEvent) {
                parse_gpx(loadEvent.target.result);
                readFiles(files_array);
            }
            reader.readAsText(file);
        } else {
            removePopup();
        }
    }

    function removePopup () {
            // 縮尺の調整
            map.fitBounds(bounds)
            // 表示リストの描画
            routes.forEach(function (route) {
                var list = $('<li>' + route.title + '</li>');
                list.append('<span>' + Math.floor(route.distance / 100) / 10 + 'km' + '</span>');
                list.on('click', function () {
                    route.polyline.setVisible(!route.polyline.visible);
                    if (route.polyline.visible) {
                        $(this).removeClass('hidden');
                    } else {
                        $(this).addClass('hidden');
                    }
                });
                $('#list>ul').append(list);
            });

            // プログレスバー等の削除
            $('#progress').hide();
            $('.popup').hide();
    }

    // 画像を保存
    $('#capture').on('click', function () {
        // コントロールを消す
        map.setOptions({ disableDefaultUI: true });
        $('#original_controll').hide();

        var capture = function () {
            html2canvas(document.querySelector("#map"), {
                useCORS: true
            }).then(function (canvas) {
                // コントロールを復活
                map.setOptions({ disableDefaultUI: false });
                $('#original_controll').show();

                var base64 = canvas.toDataURL('image/png');
                var blob = Base64toBlob(base64);
                saveBlob(blob, 'journeymap.png');
            });
        }
        setTimeout(capture, 50);
    });

    // サンプル表示用
    $('.popwindow .label .sample').on('click', function (e) {
        e.preventDefault();
        [1,2,3,4,5,6,7,8].forEach(function (i) {
            var filename = './sample/' + i + '.gpx';
            $.ajax({
                url : filename,
                type : 'GET',
                dataType : 'text', 
                success : function (data) {
                    parse_gpx(data);
                }
            });
        });
        $(document).ajaxStop(function() {
            removePopup();
        });
    });

    $('#files').on('change', function (e) {
        var file_array = [];
        $(e.target.files).each(function (i, file) {
            file_array.push(file);
        });
        files_length = file_array.length;
        readFiles(file_array);
    });

    $('#menuclose').on('click', function () {
        $('#menu').hide();
    });
    $('#menuopen').on('click', function () {
        $('#menu').show();
    });

    // Base64データをBlobデータに変換
    function Base64toBlob(base64) {
        // カンマで分割して以下のようにデータを分ける
        // tmp[0] : データ形式（data:image/png;base64）
        // tmp[1] : base64データ（iVBORw0k～）
        var tmp = base64.split(',');
        // base64データの文字列をデコード
        var data = atob(tmp[1]);
        // tmp[0]の文字列（data:image/png;base64）からコンテンツタイプ（image/png）部分を取得
        var mime = tmp[0].split(':')[1].split(';')[0];   //  1文字ごとにUTF-16コードを表す 0から65535 の整数を取得
        var buf = new Uint8Array(data.length);
        for (var i = 0; i < data.length; i++) {
            buf[i] = data.charCodeAt(i);
        }
        var blob = new Blob([buf], { type: mime });
        return blob;
    }

    // 画像のダウンロード
    function saveBlob(blob, fileName) {
        var url = (window.URL || window.webkitURL);
        // ダウンロード用のURL作成
        var dataUrl = url.createObjectURL(blob);
        // イベント作成
        var event = document.createEvent("MouseEvents");
        event.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        // a要素を作成
        var a = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
        // ダウンロード用のURLセット
        a.href = dataUrl;
        // ファイル名セット
        a.download = fileName;
        // イベントの発火
        a.dispatchEvent(event);
    }

})();
