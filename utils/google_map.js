const axios = require('axios')

async function getRoute(deptLat, deptLong, destLat, destLong) {
    const baseUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&mode=transit&'
    const points = 'origins=' + deptLat + ',' + deptLong + '&destinations=' + destLat + ',' + destLong + '&'
    const regionNkey = 'region=KR&key=AIzaSyCoW_VU0CZZl2S7T9dte4vJfHSUSQe5p2U'

    const url = baseUrl + points + regionNkey

    const response = await axios.get(url)
    return JSON.stringify(response.data)
}

module.exports = {
    getRoute
}