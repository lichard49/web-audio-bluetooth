char bluetooth_media_title[255];
bool f_bluetoothsink_metadata_received = false;

cbuf circBuffer(1024 * 24);

#define BUFFSIZE 32 
uint8_t mp3buff[BUFFSIZE];

void avrc_metadata_callback(uint8_t data1, const uint8_t *data2) {
    Serial.printf("AVRC metadata rsp: attribute id 0x%x, %s\n", data1, data2);
    if (data1 == 0x1) { // Title
        strncpy(bluetooth_media_title, (char *)data2, sizeof(bluetooth_media_title) - 1);
    } else if (data1 == 0x2) {
        strncat(bluetooth_media_title, " - ", sizeof(bluetooth_media_title) - 1);
        strncat(bluetooth_media_title, (char *)data2, sizeof(bluetooth_media_title) - 1);
        f_bluetoothsink_metadata_received = true;
    }
}

void handle_stream() {
  if (circBuffer.available()) { 
      int bytesRead = circBuffer.read((char *)mp3buff, BUFFSIZE);
      // If we didn't read the full 32 bytes, that's a worry
      // if (bytesRead != BUFFSIZE) Serial.printf("Only read %d bytes from  circular buffer\n", bytesRead);
  }
}

void read_data_stream(const uint8_t *data, uint32_t length) {
  if (circBuffer.room() > length) { // If we get -1 here it means nothing could be read from the stream
    if (length > 0) { // Add them to the circular buffer
      circBuffer.write((char *)data, length); // length seems to be 4096 every time
      Serial.printf("\nRead %lu bytes", length);
      // Serial.printf("%d\n",data[0]); //will break code somehow  
      Serial.println(length); //0.05
      // Serial.println(data[0]);
      // Serial.println(data[1000]);
      // Serial.println(data[0]<<8 | data[1]); //more wave like
      // Serial.println(data[1000]<<8 | data[1001]); //more wave like
      // for(int i=0;i<length;i+=2){
      //   Serial.println(data[i]<<8 | data[i+1]);
      // }
      // Serial.println(data[0] | data[1]<<8); //top/down rectangles
      
    }
  } else {
    Serial.println("\nNothing to read from the stream");
  }  
}
