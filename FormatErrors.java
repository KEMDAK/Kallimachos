import java.io.BufferedReader;
import java.io.FileReader;
import java.io.PrintWriter;
import java.io.File;
import java.io.IOException;

import java.lang.StringBuilder;

public class FormatErrors {
	public static void main(String[] args) throws IOException{
		formatErrors(new File("./app/"));
		formatErrors(new File("./config/"));
	}

	public static void formatErrors(File cur) throws IOException{
		File[] files = cur.listFiles();

		for (File file : files) {

			if(file.isDirectory()) {
				formatErrors(file);
			}
			else if(file.isFile()) {
				if(!file.getName().matches("\\w+.js")) continue;

				System.out.println(file.getName());

				BufferedReader in = new BufferedReader(new FileReader(file));
				StringBuilder sb = new StringBuilder("");


				int i = 1;
				while(in.ready()){
					String line = in.readLine();

					if(line.contains("req.err = "))
						line = line.replaceAll("\\w+.js, Line: \\d+", file.getName() + ", Line: " + i);

					sb.append(line + "\n");

					i++;
				}

				in.close();

				PrintWriter out = new PrintWriter(file);
				out.print(sb);
				out.flush();
				out.close();
			}
		}
	}
}
