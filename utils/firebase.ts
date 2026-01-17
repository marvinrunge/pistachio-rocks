import { initializeApp } from "firebase/app";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
    apiKey: "AIzaSyD3a-kotb1dMrrnVIKRSufri36DpF2tC9c",
    authDomain: "pistachio-rocksgit-75387-5c432.firebaseapp.com",
    projectId: "pistachio-rocksgit-75387-5c432",
    storageBucket: "pistachio-rocksgit-75387-5c432.firebasestorage.app",
    messagingSenderId: "641988100474",
    appId: "1:641988100474:web:764a17ded900c45a3516c3"
};

const app = initializeApp(firebaseConfig);
export const functions = getFunctions(app, "europe-west3");
