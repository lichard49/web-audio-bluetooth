import Levenshtein as l
import sys

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
    string1 = csvToString(file_path + "\\input_test.csv")
    string2 = csvToString(file_path + "\\output_test.csv")
    editops = l.editops(string1, string2)
    print(editops)
    print(len(editops) / len(string1))

                     
        