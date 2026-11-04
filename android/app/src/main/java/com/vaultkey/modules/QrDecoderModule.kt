package com.vaultkey.modules

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.facebook.react.bridge.*
import com.google.zxing.*
import com.google.zxing.common.HybridBinarizer
import java.io.File
import java.io.InputStream

class QrDecoderModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "QrDecoderModule"

    @ReactMethod
    fun decodeQrFromFile(filePathOrUri: String, promise: Promise) {
        try {
            val bitmap = loadBitmap(filePathOrUri)
            if (bitmap == null) {
                promise.reject("ERR_LOAD_IMAGE", "Could not load image file from $filePathOrUri")
                return
            }

            val width = bitmap.width
            val height = bitmap.height
            val pixels = IntArray(width * height)
            bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

            val source = RGBLuminanceSource(width, height, pixels)
            val binaryBitmap = BinaryBitmap(HybridBinarizer(source))

            val reader = MultiFormatReader()
            val hints = mapOf<DecodeHintType, Any>(
                DecodeHintType.POSSIBLE_FORMATS to listOf(BarcodeFormat.QR_CODE),
                DecodeHintType.TRY_HARDER to true
            )

            val result = reader.decode(binaryBitmap, hints)
            val resMap = Arguments.createMap().apply {
                putBoolean("success", true)
                putString("text", result.text)
            }
            promise.resolve(resMap)
        } catch (notFound: NotFoundException) {
            promise.reject("ERR_NO_QR", "No QR code could be found in the selected image")
        } catch (e: Exception) {
            promise.reject("ERR_DECODE", e.message, e)
        }
    }

    private fun loadBitmap(pathOrUri: String): Bitmap? {
        return try {
            if (pathOrUri.startsWith("content://") || pathOrUri.startsWith("file://")) {
                val uri = Uri.parse(pathOrUri)
                val input: InputStream? = reactApplicationContext.contentResolver.openInputStream(uri)
                val bmp = BitmapFactory.decodeStream(input)
                input?.close()
                bmp
            } else {
                val f = File(pathOrUri)
                if (f.exists()) {
                    BitmapFactory.decodeFile(f.absolutePath)
                } else null
            }
        } catch (e: Exception) {
            null
        }
    }
}
