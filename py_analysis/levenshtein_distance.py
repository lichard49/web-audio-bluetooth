import Levenshtein as l
import sys
import os
import numpy as np
import matplotlib.pyplot as plot
import scipy.stats as stats

def csvToString(file_path):
    csvString = ""
    with open(file_path, 'r') as file:
        for line in file:
            try:
                line = line.strip()
                line_parts = line.split(',')[0]
                csvString += line_parts
            except Exception as e:
                print(e)

    return csvString

if __name__ == "__main__":
    file_path = sys.argv[1]
    dirname = os.path.dirname(__file__)
    file_path = os.path.join(dirname, file_path)
    string_input = csvToString(file_path + "input_test.csv")
    i = 0
    x = []
    for filename in os.listdir(file_path + "letter_output_test"):
        string_output = csvToString(file_path + "\\letter_output_test\\" + filename)
        editops = l.editops(string_input, string_output)

        remove = 0
        for idx in range(0, len(editops)):
            op, str1_idx, str2_idx = editops[idx]
            if(str1_idx > 40):
                break
            remove += 1

        del editops[0: remove]

        x.append(len(editops))
        i += 1

    std = np.std(x)
    mean = np.mean(x)
    y = stats.norm.pdf(x, mean, std)

    txt = "mean: " + str(mean) + " std dev: " + str(std)
    print(txt)
    plot.xlabel("Levenshtein distance")
    plot.ylabel("Frequency")
    plot.title("Histogram of Levenshtein distances over " + str(len(x)) + " trials")
    plot.hist(x, bins=20, edgecolor='black', alpha=0.7)  # Using 20 bins for the histogram
    plot.show()
