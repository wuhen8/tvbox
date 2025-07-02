// Updated for Vercel Edge Functions — cheerio must be imported properly
import * as cheerioModule from 'cheerio';
const cheerio = /** @type {typeof import('cheerio')} */ (cheerioModule);

export const config = {
  runtime: 'edge',
};

async function fetchUrl(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      'Referer': 'https://www.xvideos.com/',
      'Cookie': 'session_ath=black;',
    },
  });
  return await res.text();
}

function parseVideoList(html) {
  const $ = cheerio.load(html);
  const list = [];
  $('.thumb-block').each((i, el) => {
    const id = $(el).attr('id')?.replace('video_', '') || '';
    const href = $(el).find('a').attr('href') || '';
    const img = $(el).find('img').attr('data-src') || '';
    const mark = $(el).find('.video-hd-mark').text() || '';
    const title = $(el).find('.title a').attr('title') || '';
    const duration = $(el).find('.duration').text() || '';
    list.push({
      id,
      type_id: 26,
      vod_name: title,
      vod_id: href,
      vod_pic: img,
      mark,
      vod_remarks: duration,
    });
  });
  return list;
}

function parseVideoPlay(html) {
  const videoUrlHigh = html.match(/html5player.setVideoUrlHigh\('(.*?)'\)/)?.[1] || '';
  const videoHLS = html.match(/html5player.setVideoHLS\('(.*?)'\)/)?.[1] || '';
  const title = html.match(/html5player.setVideoTitle\('(.*?)'\)/)?.[1] || '';
  const thumb = html.match(/html5player.setThumbUrl169\('(.*?)'\)/)?.[1] || '';
  const id = html.match(/html5player = new HTML5Player\('html5video', (.*?)\);/)?.[1] || '';

  return [
    {
      vod_name: title,
      VideoUrlHigh: videoUrlHigh,
      VideoHLS: videoHLS,
      vod_pic: thumb,
      vod_id: id,
      vod_play_url: `01$${videoHLS}`,
      vod_play_from: 'xvideos',
    },
  ];
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  const ids = searchParams.get('ids');
  const wd = searchParams.get('wd');
  const pg = parseInt(searchParams.get('pg') || '1');
  const t = searchParams.get('t');

  let result = {};

  try {
    let url = '', html = '', list = [];

    if (path) {
      url = `https://www.xvideos.com/${path}`;
      html = await fetchUrl(url);
      list = parseVideoList(html);
    } else if (ids) {
      url = `https://www.xvideos.com${ids}`;
      html = await fetchUrl(url);
      list = parseVideoPlay(html);
    } else if (wd) {
      url = `https://www.xvideos.com?k=${wd}&p=${pg - 1}`;
      html = await fetchUrl(url);
      list = parseVideoList(html);
    } else if (t) {
      url = `https://www.xvideos.com/${t}/${pg - 1}`;
      html = await fetchUrl(url);
      list = parseVideoList(html);
    } else {
      list = [
        {
          vod_id: 23410,
          vod_name: '西瓜影视',
          type_id: 25,
          type_name: '开心鬼传媒',
          vod_en: 'xiaofuyou',
          vod_time: '2025-07-01 21:21:03',
          vod_remarks: '20:27',
          vod_play_from: 'mahua',
        },
        {
          vod_id: 23417,
          vod_name: 'JVID',
          type_id: 23,
          type_name: 'mini传媒',
          vod_en: 'woyaoyongyuan',
          vod_time: '2025-07-01 21:20:13',
          vod_remarks: '30:25',
          vod_play_from: 'mahua',
        },
      ];
    }

    result = {
      code: 1,
      msg: 'ok',
      page: 1,
      pagecount: 1,
      limit: '20',
      total: list.length,
      list,
    };
  } catch (err) {
    result = { code: 0, msg: 'error', error: err.message };
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
