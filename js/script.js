const API_KEY = '3647b559a33a4aebbbb03627262001'
window.IS_TEST_MODE = false; //------------------------------false trueでテストと切り替え！ 

const form = document.getElementById('weather-form')
const cityInput = document.getElementById('city-input')
const message = document.getElementById('message')
const results = document.getElementById('results')
const timeEl = document.getElementById('results-time')

const countryEl = document.getElementById('results-country')
const cityEl = document.getElementById('results-city')
const tempEl = document.getElementById('results-temp')
const iconImg = document.getElementById('results-icon')
const condText = document.getElementById('results-text')

const moonTranslate = {
	"New Moon": "新月",
	"Waxing Crescent": "三日月",
	"First Quarter": "上弦の月",
	"Waxing Gibbous": "満月前",
	"Full Moon": "満月",
	"Waning Gibbous": "満月後",
	"Last Quarter": "下弦の月",
	"Waning Crescent": "明けの三日月"
};
let lightningTimer;
window.timeOffset = 0;

// --- 関数の登録 ---
function setMessage(text) {
	if (text) {
		message.textContent = text;
		message.style.display = 'block';
	} else {
		message.textContent = '';
		message.style.display = 'none';
	}
}

function hideResults() {
	results.style.display = 'none'
}

function showResults() {
	results.style.display = 'block'
}


// -------------------ローカルで前回の結果を記憶したり読み込んだり
const savedCity = localStorage.getItem('lastCity')

if (savedCity) {
	cityInput.value = savedCity;

}


async function fetchWeather(city) {
	// 修正：引数 city がなくても、window.currentData があれば動くようにする
	if (!city && !IS_TEST_MODE && !window.currentData) return;

	let data;

	if (IS_TEST_MODE) {

		data = window.currentData || {
			isDay: 0,
			conditionCode: 1000,
			moonPhase: "Full Moon",
			temp: 0,
			windKph: 0,
			cityName: "Test City",
			precip: 0,
			country: "Test Land",
			localtime: "2026/01/01 00:00",
			icon: "",
			text: "Test Mode"
		};


		const iconMap = {
			1000: 113, // 快晴
			1003: 116, // 晴れ時々曇り
			1006: 119, // 曇り
			1009: 122, // どんより
			1030: 143, // 霧 (★追加)
			1063: 176, // 軽い雨 (★追加)
			1183: 296, // 普通の雨 (★追加)
			1195: 308, // 激しい雨
			1087: 389, // 雷雨
			1225: 338  // 大雪
		};
		const iconNumber = iconMap[data.conditionCode] || 113;
		const timePath = data.isDay === 1 ? 'day' : 'night';
		data.icon = `https://cdn.weatherapi.com/weather/64x64/${timePath}/${iconNumber}.png`;

		//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!テストモード!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

	} else {

		try {
			setMessage('世界からデータをお取り寄せ中...');
			hideResults();

			// 天気を取得
			const res = await fetch(`https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${encodeURIComponent(city)}&aqi=no&lang=ja`);
			if (!res.ok) throw new Error('都市が見つからないみたい；；');
			const weather = await res.json();

			// 月のを取得
			const astroRes = await fetch(`https://api.weatherapi.com/v1/astronomy.json?key=${API_KEY}&q=${encodeURIComponent(city)}`);
			const astro = await astroRes.json();

			// 本物のデータをテスト用と同じ形に整理する！
			data = {
				isDay: weather.current.is_day,
				conditionCode: weather.current.condition.code,
				moonPhase: astro.astronomy.astro.moon_phase,
				temp: weather.current.temp_c,
				windKph: weather.current.wind_kph,
				cityName: weather.location.name,
				precip: weather.current.precip_mm,
				country: weather.location.country,
				localtime: weather.location.localtime,
				icon: weather.current.condition.icon,
				text: weather.current.condition.text
			};
		} catch (err) {
			console.error("APIエラー:", err);
			setMessage('データが取れなかったよ；；都市名を確かめてみてね。');
			return;
		}
	}


	// -----------------------UIとアニメ--------------------------------------------


	//計算
	const windMs = (data.windKph / 3.6).toFixed(1);
	const slant = data.windKph * 1.0;
	const duration = 80 / (parseFloat(windMs) + 0.1);
	document.documentElement.style.setProperty('--wind-duration', `${duration}s`);
	const rainCount = Math.min(1600, Math.floor(data.precip * 45));
	const snowCount = Math.min(1600, Math.floor(data.precip * 35));
	const windAngle = Math.atan(parseFloat(windMs) / 10) * (180 / Math.PI) * 1.5;
	const finalAngle = windAngle;
	const isSnow = (data.conditionCode >= 1210 && data.conditionCode <= 1225);
	//変数へ反映
	document.documentElement.style.setProperty('--wind-angle', `${finalAngle}deg`);

	//情報の更新

	if (countryEl) countryEl.textContent = data.country;
	if (cityEl) cityEl.textContent = data.cityName;
	if (tempEl) tempEl.innerHTML = `${data.temp} <span>°C</span>`;
	const windEl = document.getElementById('results-wind');
	if (windEl) {
		windEl.textContent = `風速: ${windMs} m/s`;
	} else {
		console.warn("results-wind というIDがHTMLに見つからないよ！");
	}

	const precipEl = document.getElementById('results-precip');
	if (precipEl) {
		const isSnow = (data.conditionCode >= 1210 && data.conditionCode <= 1225);
		precipEl.textContent = `${isSnow ? "降雪量" : "降水量"}: ${data.precip} mm`;
	}

	//アイコン
	if (iconImg && data.icon) {
		let iconUrl = String(data.icon).startsWith('//') ? 'https:' + data.icon : data.icon;
		iconImg.src = iconUrl;
	}
	if (condText) condText.textContent = data.text || "不明な天気";
	//月
	const phaseFile = data.moonPhase.replace(/\s+/g, '-');
	const moonMiniIcon = document.getElementById('moon-mini-icon');
	const moonPhaseText = document.getElementById('moon-phase-text');
	if (moonPhaseText) moonPhaseText.textContent = moonTranslate[data.moonPhase] || data.moonPhase;
	if (moonMiniIcon) moonMiniIcon.src = `img/${phaseFile}.png`;


	if (data.moonPhase === "New Moon") {
            moonMiniIcon.style.filter = "brightness(0)";
        } else {
            moonMiniIcon.style.filter = "";
        }
    

	const moonImg = document.querySelector('img.moon');
	const sunMoonContainer = document.querySelector('.sun-moon-light');
	if (moonImg) moonImg.src = `img/${phaseFile}.png`;
	if (sunMoonContainer) sunMoonContainer.className = `sun-moon-light ${phaseFile}`;

	//背景とクラス切り替え
	const weatherClass = getWeatherClass(data.conditionCode);
	const timeClass = data.isDay === 1 ? 'day' : 'night';
	document.body.className = `${timeClass} ${weatherClass}`;

	//星
	if (timeClass === 'night' && weatherClass !== 'heavy-rain-bg' && weatherClass !== 'thunder-bg') {
		createStars();
	} else {
		const starLayer = document.getElementById('star-layer');
		if (starLayer) starLayer.innerHTML = '';
	}

	//雨・雪・雷
	if (isSnow) {
		createSnow(snowCount, data.windKph, data.windKph > 20);
		document.getElementById('rain-layer').innerHTML = '';
	} else if (['heavy-rain-bg', 'thunder-bg', 'rainy-bg'].includes(weatherClass)) {
		createRain(rainCount);
		document.getElementById('snow-layer').innerHTML = '';
	} else {
		document.getElementById('rain-layer').innerHTML = '';
		document.getElementById('snow-layer').innerHTML = '';
	}

	if (weatherClass === 'thunder-bg') {
		startThunder();
	} else {
		clearTimeout(lightningTimer);
		const lLayer = document.getElementById('lightning-layer');
		if (lLayer) lLayer.classList.remove('flash-it');
	}

	function createRain(dropCount) {
		const rainLayer = document.getElementById('rain-layer');
		rainLayer.innerHTML = '';

		for (let i = 0; i < dropCount; i++) {
			const drop = document.createElement('div');
			drop.className = 'rain-drop';

			// ランダム配置
			drop.style.left = Math.random() * 100 + '%';
			drop.style.top = Math.random() * 100 + '%'; // 最初から画面内に散らしておく

			const fallDuration = 0.4 + Math.random() * 0.4; // 嵐の時は速く
			const delay = Math.random() * -2; // 最初から降ってる状態にする

			drop.style.animationDuration = fallDuration + 's';
			drop.style.animationDelay = delay + 's';
			rainLayer.appendChild(drop);
		}
	}

	// ★現地時間と東京時間の差をミリ秒で計算
	const localTimeApi = new Date(data.localtime.replace(/-/g, '/')).getTime();
	window.timeOffset = localTimeApi - Date.now();

	console.log("Fooooooooo!!!!!ぱーでき！！"); // これがコンソールに出るかチェック
	setMessage('');
	showResults();

	if (cityInput) cityInput.value = '';

	window.currentData = data;

	if (data.cityName && data.cityName !== "Test City") {
		localStorage.setItem('lastCity', data.cityName);
	}
}



// ----------------------☆☆☆---------------------------------------------------------

function createStars() {
	const starLayer = document.getElementById('star-layer');
	if (!starLayer) return;
	starLayer.innerHTML = '';

	for (let i = 0; i < 150; i++) {
		const star = document.createElement('div');
		star.className = 'star';

		// 画面全体に広がるように 100vw / 100vh に設定
		star.style.left = Math.random() * 100 + 'vw';
		star.style.top = Math.random() * 100 + 'vh';

		const size = Math.random() * 2 + 'px';
		star.style.width = size;
		star.style.height = size;
		star.style.animationDelay = Math.random() * 5 + 's';

		starLayer.appendChild(star);
	}
}





// --- メインの処理 ---------------------------------------------------------------


// async function fetchWeather(city) {
// 	if (!city) return;

// 	setMessage('取得中...');
// 	hideResults();


// const windMs = (testSettings.windKph / 3.6).toFixed(1);


// const windEl = document.getElementById('results-wind');
// windEl.textContent = `風速: ${windMs} m/s`;


// const duration = 80 / (parseFloat(windMs) + 0.1); 
// document.documentElement.style.setProperty('--wind-duration', `${duration}s`);
//     // 雨の斜めも風速で変える
//     const slant = testSettings.windKph * 0.5; 
//     document.documentElement.style.setProperty('--rain-slant', `${slant}deg`);

// //月齢
// const moonMiniIcon = document.getElementById('moon-mini-icon');
// const moonPhaseText = document.getElementById('moon-phase-text');

// const phaseName = testSettings.moonPhase;
// const phaseFileName = phaseName.replace(/\s+/g, '-');

// const japanesePhase = moonTranslate[phaseName] || phaseName; 
// moonPhaseText.textContent = `${japanesePhase}`;

// moonMiniIcon.src = `img/${phaseFileName}.png`;

// 	try {
// 		const url = `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${encodeURIComponent(city)}&aqi=no&lang=ja`;
// 		const res = await fetch(url);
// 		if (!res.ok) { throw new Error(`HTTP ${res.status}`); }
// 		const data = await res.json();

// 		const astroUrl = `https://api.weatherapi.com/v1/astronomy.json?key=${API_KEY}&q=${encodeURIComponent(city)}`;
//         const astroRes = await fetch(astroUrl);
//         const astroData = await astroRes.json();
// 		const moonPhase = astroData.astronomy.astro.moon_phase;
// 		const moonImg = document.querySelector('img.moon');
// const sunMoonContainer = document.querySelector('.sun-moon-light');
// 		const phaseClass = moonPhase.replace(/\s+/g, '-');
//         moonEl.classList.add(phaseClass);
// 		moonImg.src = `img/${phaseFileName}.png`;
// 		sunMoonContainer.className = `sun-moon-light ${phaseFileName}`;

// 		// データの表示）
// 		countryEl.textContent = data.location.country || '';
// 		cityEl.textContent = data.location.name || '';
// 		if (timeEl) { timeEl.textContent = ` ${data.location.localtime}`; }
// 		tempEl.innerHTML = `：${data.current.temp_c} <span>°C</span>`;

// 		let iconUrl = (data.current.condition.icon || '').startsWith('//') ? 'https:' + data.current.condition.icon : data.current.condition.icon;
// 		iconImg.src = iconUrl;
// 		iconImg.alt = data.current.condition.text;
// 		condText.textContent = data.current.condition.text;

// 		// 背景切り替え
// 		const conditionCode = data.current.condition.code;
// 		const isDay = data.current.is_day; //  1なら昼、0なら夜が返ってくるよ

// 		const weatherClass = getWeatherClass(conditionCode);
// 		const timeClass = isDay === 1 ? 'day' : 'night'; // 昼なら day夜ならnight

// 		document.body.className = '';
// 		document.body.className = `${timeClass} ${weatherClass}`;
// 		setMessage('');
// 		showResults();

// 		// 成功したら保存する 
// 		localStorage.setItem('lastCity', city);

// 	} catch (err) {
// 		console.error(err);
// 		setMessage('取得に失敗しました。都市名を確認して再度お試しください。\n(APIのアクセス制限の上限に達している可能性もあります。時間をおいたのち、再度お試しください。)');
// 	}

// //---雨 ---

// const weatherClass = getWeatherClass(testSettings.conditionCode);


// if (weatherClass.includes('rain')) {
//     createRain();
// } else {
//     document.getElementById('rain-layer').innerHTML = '';
// }

// }

//ページを読み込んだ時の処理----------自動読み込み処理いったんOFFってる
addEventListener('DOMContentLoaded', () => {
	const savedCity = localStorage.getItem('lastCity');
	if (savedCity) {
		cityInput.value = savedCity;
		fetchWeather(savedCity);
	}
});

// フォームを送信した時の処理
form.addEventListener('submit', (e) => {
	e.preventDefault();
	const city = cityInput.value.trim();
	fetchWeather(city);
});



//-----------------------------天気によってグループ分け-------------------------------------------

function getWeatherClass(code) {
	if (code === 1000) return 'sunny-bg';
	if (code === 1003) return 'partly-cloudy-bg';
	if ([1006, 1009].includes(code)) return 'cloudy-bg';
	if ([1030, 1135, 1147].includes(code)) return 'mist-bg';

	//激しい雨
	const heavyRainCodes = [1192, 1195, 1243, 1246];
	if (heavyRainCodes.includes(code)) {
		return 'heavy-rain-bg';
	}

	//激しい雨以外の飴
	if ((code >= 1063 && code <= 1072) || (code >= 1180 && code <= 1207) || (code >= 1240 && code <= 1252)) {
		return 'rainy-bg';
	}

	if ((code >= 1210 && code <= 1225) || (code >= 1255 && code <= 1264)) {
		return 'snowy-bg';
	}
	if (code >= 1087 || (code >= 1273 && code <= 1282)) {
		return 'thunder-bg';
	}
	return 'default-bg';
}

// -------------------------雨の-----------------------------------------------------------------
function createRain(dropCount) {
	const rainLayer = document.getElementById('rain-layer');
	rainLayer.innerHTML = '';

	for (let i = 0; i < dropCount; i++) {
		const drop = document.createElement('div');
		drop.className = 'rain-drop';

		// 0% 〜 100% (200vwの端から端まで) でランダムに配置
		drop.style.left = (Math.random() * 100) + '%';

		const fallDuration = 0.5 + Math.random() * 0.5;
		const delay = Math.random() * 2;
		drop.style.animationDuration = fallDuration + 's';
		drop.style.animationDelay = '-' + delay + 's';
		rainLayer.appendChild(drop);
	}
}

// ---------------------------------雪の------------------------------------------------------

function createSnow(count, speed, isBlizzard) {
	const snowLayer = document.getElementById('snow-layer');
	snowLayer.innerHTML = '';

	for (let i = 0; i < count; i++) {
		const flake = document.createElement('div');
		flake.className = 'snowflake';

		const size = 2 + Math.random() * 4 + 'px';
		flake.style.width = size;
		flake.style.height = size;

		// 雪も 0% 〜 100% の全域で発生させる
		flake.style.left = (Math.random() * 100) + '%';

		const fallDuration = (isBlizzard ? 1 : 4) + Math.random() * 3;
		const swayDuration = 2 + Math.random() * 2;
		flake.style.animationDuration = `${fallDuration}s, ${swayDuration}s`;
		flake.style.animationDelay = `-${Math.random() * 10}s`;
		snowLayer.appendChild(flake);
	}
}




// --------------------------雷の----------------------------------------------------------------

function startThunder() {
	const layer = document.getElementById('lightning-layer');
	const thunderImg = document.getElementById('thunder-img');


	const thunderList = [
		'img/thunder01.png',
		'img/thunder02.png',
		'img/thunder03.png',
		'img/thunder04.png',
		'img/thunder05.png'
	];

	if (!layer || !thunderImg) return;

	clearTimeout(lightningTimer);
	function flash() {
		const randomIndex = Math.floor(Math.random() * thunderList.length);
		thunderImg.src = thunderList[randomIndex];


		thunderImg.className = 'thunder-bolt';
		thunderImg.classList.add(`bolt-type-${randomIndex}`);

		layer.classList.add('flash-it');

		setTimeout(() => {
			layer.classList.remove('flash-it');
		}, 200);
		const nextFlash = 300 + Math.random() * 3000;
		lightningTimer = setTimeout(flash, nextFlash);
	}

	flash();
}

// --- リアルタイムで時計を更新 ---
function startClock() {
	const timeEl = document.getElementById('results-time');

	function update() {
		// ★ただの new Date() ではなく、時差（timeOffset）を足してあげる！
		const now = new Date(Date.now() + (window.timeOffset || 0));

		const y = now.getFullYear();
		const m = String(now.getMonth() + 1).padStart(2, '0');
		const d = String(now.getDate()).padStart(2, '0');
		const hh = String(now.getHours()).padStart(2, '0');
		const mm = String(now.getMinutes()).padStart(2, '0');
		const ss = String(now.getSeconds()).padStart(2, '0');

		if (timeEl) {
			timeEl.textContent = `${y}/${m}/${d} ${hh}:${mm}:${ss}`;
		}
	}

	setInterval(update, 1000);
	update();
}

addEventListener('DOMContentLoaded', () => {
	startClock();


	const savedCity = localStorage.getItem('lastCity');

	if (savedCity) {
		cityInput.value = savedCity;
		fetchWeather(savedCity);
	}
});

//------------------------------デバックツールボックス--------------------------------------


// --- 今の表示データをデバッグメニュー初期設定に反映させる ---
// --- 月齢ボタンの操作関数 ---
function setMoonPhase(phase, btn) {
    forceTestOn();
    window.currentData.moonPhase = phase;
    
    // 見た目を光らせる
    if (btn) updateButtonVisuals(btn);
    
    fetchWeather();
}

// --- syncDebugMenu 関数をアップデート（月齢同期を追記！） ---
function syncDebugMenu() {
    if (!window.currentData) return;
    const data = window.currentData;

    // スライダー
    const windSlider = document.querySelector('input[oninput*="adjustWind"]');
    const precipSlider = document.querySelector('input[oninput*="adjustPrecip"]');
    if (windSlider) {
        const windMs = (data.windKph / 3.6).toFixed(1);
        windSlider.value = windMs;
        document.getElementById('val-wind').textContent = `${windMs} m/s`;
    }
    if (precipSlider) {
        precipSlider.value = data.precip;
        document.getElementById('val-precip').textContent = `${data.precip} mm`;
    }

    //昼夜ボタン
    document.querySelectorAll('.time-btn-grid button').forEach(btn => {
        btn.classList.remove('active');
        const clickAttr = btn.getAttribute('onclick') || "";
        
        if (String(data.isDay) === "1" && clickAttr.includes('1')) {
            btn.classList.add('active');
        } 

        else if (String(data.isDay) === "0" && clickAttr.includes('0')) {
            btn.classList.add('active');
        }
    });

    //月齢メニューの出し入れもここで同期
    updateLunarVisibility(data.isDay);

    // 4. 月齢ボタン
    const moonButtons = document.querySelectorAll('.moon-btn-grid button');
    moonButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(data.moonPhase)) {
            btn.classList.add('active');
        }
    });

    // 5. お天気ボタン
    const weatherClass = getWeatherClass(data.conditionCode);
    document.querySelectorAll('.weather-btn-grid button').forEach(btn => {
        btn.classList.remove('active');
        const clickAttr = btn.getAttribute('onclick') || "";
        if (
            (weatherClass === 'sunny-bg' && clickAttr.includes('快晴')) ||
            (weatherClass === 'partly-cloudy-bg' && clickAttr.includes('晴時々曇')) ||
            (weatherClass === 'cloudy-bg' && clickAttr.includes('曇り')) ||
            (weatherClass === 'mist-bg' && clickAttr.includes('霧')) ||
            (weatherClass === 'rainy-bg' && clickAttr.includes('雨')) ||
            (weatherClass === 'heavy-rain-bg' && clickAttr.includes('豪雨')) ||
            (weatherClass === 'snowy-bg' && clickAttr.includes('雪')) ||
            (weatherClass === 'thunder-bg' && clickAttr.includes('雷雨'))
        ) { btn.classList.add('active'); }
    });
}


function toggleDebug(show) {
	const gear = document.getElementById('debug-gear');
	const menu = document.getElementById('debug-menu');

	if (show) {

		syncDebugMenu();

		gear.classList.add('hidden');
		menu.classList.add('active');
	} else {
		gear.classList.remove('hidden');
		menu.classList.remove('active');
	}
}

// メニューの外をクリックしたら閉じる
window.addEventListener('pointerdown', (e) => {
	const wrapper = document.getElementById('debug-wrapper');
	const menu = document.getElementById('debug-menu');


	if (menu && menu.classList.contains('active')) {

		if (!wrapper.contains(e.target)) {
			toggleDebug(false);
		}
	}
});

// --- パラメータ操作 ---
function handleModeChange(checked) {
	window.IS_TEST_MODE = checked;
	if (!checked) {
		// テストOFFなら、今の入力欄の都市で本番データを取得
		const city = cityInput.value || localStorage.getItem('lastCity');
		fetchWeather(city);
	}
}

function setWeather(code, text) {
	forceTestOn();
	window.currentData.conditionCode = code;
	window.currentData.text = text;
	fetchWeather();
}

// function setTime(isDay) {
// 	forceTestOn();
// 	window.currentData.isDay = isDay;
// 	fetchWeather();
// }

// 風速スライダー（m/sをkm/hに変換
function adjustWind(ms) {
	forceTestOn();
	document.getElementById('val-wind').textContent = ms;
	window.currentData.windKph = parseFloat(ms) * 3.6; // m/s -> km/h
	fetchWeather();
}

function adjustPrecip(mm) {
	forceTestOn();
	document.getElementById('val-precip').textContent = mm;
	window.currentData.precip = parseFloat(mm);
	fetchWeather();
}

function forceTestOn() {
	window.IS_TEST_MODE = true;
	const toggle = document.getElementById('mode-toggle');
	if (toggle) toggle.checked = true;

	if (!window.currentData) {
		window.currentData = {
			isDay: 1, conditionCode: 1000, moonPhase: "Full Moon",
			temp: 20, windKph: 18, cityName: "Debug Mode",
			precip: 1.5, country: "Test World", localtime: "2026/01/01 12:00",
			icon: "", text: "快晴"
		};
	}

	// ★スライダーの現在の値をデータに同期させる
	const windSlider = document.querySelector('input[oninput*="adjustWind"]');
	const precipSlider = document.querySelector('input[oninput*="adjustPrecip"]');

	if (windSlider) {
		window.currentData.windKph = parseFloat(windSlider.value) * 3.6;
		document.getElementById('val-wind').textContent = windSlider.value;
	}
	if (precipSlider) {
		window.currentData.precip = parseFloat(precipSlider.value);
		document.getElementById('val-precip').textContent = precipSlider.value;
	}
}
function resetToProduction() {

	window.IS_TEST_MODE = false;

	const toggle = document.getElementById('mode-toggle');
	if (toggle) toggle.checked = false;

	window.currentData = null;

	const city = cityInput.value || localStorage.getItem('lastCity');
	if (city) {
		fetchWeather(city);
	}

	toggleDebug(false);

	console.log("SYSTEM: Returned to production mode.");
}

// ボタンの見た目
function updateButtonVisuals(btn) {
	if (!btn) return;
	// 同じグループ（親要素の中）のボタンから active を消す
	const parent = btn.parentElement;
	parent.querySelectorAll('button').forEach(b => b.classList.remove('active'));
	// 押されたボタンに active をつける
	btn.classList.add('active');
}

function setWeather(code, text) {
	forceTestOn();
	window.currentData.conditionCode = code;
	window.currentData.text = text;

	// クリックされたボタンを特定して光らせる（イベントから逆引き）
	updateButtonVisuals(event.currentTarget);

	fetchWeather();
}

// 昼夜ボタン
function setTime(isDay) {
    forceTestOn();
    window.currentData.isDay = isDay;

    updateButtonVisuals(event.currentTarget);
    
    updateLunarVisibility(isDay);
    
    fetchWeather();
}

function updateLunarVisibility(isDay) {
    const lunarItem = document.getElementById('debug-lunar-item');
    if (!lunarItem) return;

    if (isDay === 1) {
        // お昼（1）なら隠すクラスをつける
        lunarItem.classList.remove('visible');
        lunarItem.classList.add('hidden');
    } else {
        // 夜（0）なら出すクラスをつける
        lunarItem.classList.remove('hidden');
        lunarItem.classList.add('visible');
    }
}

//-----------------スクショモード--------------

function enterScreenshotMode() {
	// UIを隠すクラスをbodyに付与
	document.body.classList.add('screenshot-mode');

	// デバッグメニュー自体も閉じておく
	toggleDebug(false);

	// 画面のどこかをタップ/クリックしたら解除する設定
	// ボタンを押した瞬間のクリックで即解除されないよう、100ミリ秒ほど待ってから登録
	setTimeout(() => {
		const restoreUI = () => {
			document.body.classList.remove('screenshot-mode');
			// 一度発動したらこの「解除用リスナー」自体を削除する
			window.removeEventListener('pointerdown', restoreUI);
		};


		window.addEventListener('pointerdown', restoreUI);
	}, 100);
}