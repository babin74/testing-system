import { generate } from "randomstring"

const charset: string = "";


function getRandomFileName() {
    const ts = new Date().getMilliseconds() % 10000
    const id = generate({ length: 8, charset: "qwertyuiopasdfghjklzxcvbnm0123456789" })
    return "./build/" + id + "_" + ts
}

export {
    getRandomFileName
}