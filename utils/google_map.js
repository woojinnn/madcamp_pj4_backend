const axios = require('axios')

async function getRoute(deptLat, deptLong, destLat, destLong) {
    const baseUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&'
    const points = 'origins=' + deptLat + ',' + deptLong + '&destinations=' + destLat + ',' + destLong + '&'
    const regionNkey = 'region=KR&key=AIzaSyCoW_VU0CZZl2S7T9dte4vJfHSUSQe5p2U'

    const url = baseUrl + points + regionNkey
    console.log(url)

    const response = await axios.get(url)
    console.log(JSON.stringify(response.data))

    return response.data
}

async function getLatLong(address) {
    const baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json?address='
    const key = '&key=AIzaSyCoW_VU0CZZl2S7T9dte4vJfHSUSQe5p2U'

    const url = baseUrl + encodeURI(address) + key
    console.log(url)

    const response = await axios.get(url)
    const result = response.data.results[0]
    if (result === undefined) {
        return null
    }

    return result.geometry.location
}

module.exports = {
    getRoute,
    getLatLong
}