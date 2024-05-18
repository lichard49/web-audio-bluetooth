import matplotlib.pyplot as plt
import sys
import os

if __name__ == '__main__':
  file_path = sys.argv[1]
  dirname = os.path.dirname(__file__)
  filename = os.path.join(dirname, file_path)
  data = []
  with open(filename, 'rb') as file:
    for line in file:
      try:
        line = line.decode('utf-8')
        line = line.strip()
        line_parts = line.split(',')
        value = int(line_parts[0])
        data.append(value)
      except Exception:
        pass

  plt.title("Sound Wave to Analyze")
  plt.ylabel("Pulse Code Modulation Value")
  plt.xlabel("time")
  plt.plot(data)
  plt.show()