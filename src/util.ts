function generate(length: number, charset: string) {
    let result: string = ''
    for (let i = 0; i < length; ++i) {
        result += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return result
}

function getRandomFileName() {
    const ts = new Date().getMilliseconds() % 10000
    const id = generate(8, "qwertyuiopasdfghjklzxcvbnm0123456789")
    return "./build/" + id + "_" + ts
}

export {
    getRandomFileName
}